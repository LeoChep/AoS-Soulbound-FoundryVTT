

export default class ModuleInitializer extends Dialog {

    constructor(module, title, html) {
        super({
            title: title,
            content: html,
            module: game.modules.get(module),
            buttons: {
                initialize: {
                    label: game.i18n.localize("BUTTON.INITIALIZE"),
                    callback: async () => {
                        game.settings.set(module, "initialized", true)
                        await this.initialize()
                        ui.notifications.notify(game.modules.get(module).title + `: ${game.i18n.localize("INITIALIZER.Complete")}`)
                    }
                },
                update: {
                    label: game.i18n.localize("BUTTON.UPDATE"),
                    condition : game.settings.get(module, "initialized"),
                    callback: async () => {
                        let updater = await game.aos.apps.ModuleUpdater.create(game.modules.get(module), this)
                        updater.render(true)
                    }
                },
                no: {
                    label: game.i18n.localize("BUTTON.NO"),
                    callback: () => {
                        game.settings.set(module, "initialized", true)
                        ui.notifications.notify(game.i18n.localize("INITIALIZER.Skipped"))
                    }
                }
            }
        })

        this.folders = {
            "Scene": {},
            "Item": {},
            "Actor": {},
            "JournalEntry": {},
            "RollTable" : {}
        }

        this.journals = {};
        this.actors = {};
        this.scenes = {};
        this.tables = {};
        this.moduleKey = module
        this.scenePacks = []
    }

    async initialize() {
        return new Promise((resolve) => {
            fetch(`modules/${this.moduleKey}/initialization.json`).then(async r => r.json()).then(async json => {
                let createdFolders = await Folder.create(json)
                for (let folder of createdFolders)
                    this.folders[folder.type][folder.name] = folder;

                for (let folderType in this.folders) {
                    for (let folder in this.folders[folderType]) {

                        let parent = this.folders[folderType][folder].getFlag(this.moduleKey, "initialization-parent")
                        if (parent) {
                            let parentId = this.folders[folderType][parent].id
                            await this.folders[folderType][folder].update({ parent: parentId })
                        }
                    }
                }

                await this.initializeEntities()
                await this.initializeScenes()
                resolve()
            })
        })
    }

    async initializeEntities() {

        let packList = this.data.module.flags.initializationPacks

        for (let pack of packList) {
            if (game.packs.get(pack).documentName == "Scene")
            {
                this.scenePacks.push(pack)
                continue
            }
            let documents = await game.packs.get(pack).getDocuments();
            for (let document of documents) {
                let folder = document.getFlag(this.moduleKey, "initialization-folder")
                if (folder)
                    document.updateSource({ "folder": this.folders[document.documentName][folder].id })
                if (document.flags[this.moduleKey].sort)
                    document.updateSource({ "sort": document.flags[this.moduleKey].sort })
            }
            try {
            switch (documents[0].documentName) {
                case "Actor":
                    ui.notifications.notify(this.data.module.title + ": Initializing Actors")
                    let existingDocuments = documents.filter(i => game.actors.has(i.id))
                    let newDocuments = documents.filter(i => !game.actors.has(i.id))
                    let createdActors = await Actor.create(newDocuments)
                    for (let actor of createdActors)
                        this.actors[actor.name] = actor
                    for (let doc of existingDocuments)
                    {
                        let existing = game.actors.get(doc.id)
                        await existing.update(doc.toObject())
                        ui.notifications.notify(`Updated existing document ${doc.name}`)
                    }
                    break;
                case "Item":
                    ui.notifications.notify(this.data.module.title + ": Initializing Items")
                    await Item.create(documents)
                    break;
                case "JournalEntry":
                    ui.notifications.notify(this.data.module.title + ": Initializing Journals")
                    let createdEntries = await JournalEntry.create(documents)
                    for (let entry of createdEntries)
                        this.journals[entry.name] = entry
                    break;
                case "RollTable":
                    ui.notifications.notify(this.data.module.title + ": Initializing Tables")
                    await RollTable.create(documents)
                    break;
                }
            }
            catch(e)
            {
                console.error(e)
            }
        }
    }

    async initializeScenes() {
        ui.notifications.notify(this.data.module.title + ": Initializing Scenes")
        for (let pack of this.scenePacks)
        {
            let m = game.packs.get(pack)
            let maps = await m.getDocuments()
            for (let map of maps) {
                let folder = map.getFlag(this.moduleKey, "initialization-folder")
                if (folder)
                    map.updateSource({ "folder": this.folders["Scene"][folder].id })
            }
            await Scene.create(maps).then(sceneArray => {
                sceneArray.forEach(async s => {
                    let thumb = await s.createThumbnail();
                    s.update({ "thumb": thumb.thumb })
                })
            })
        }
    }
}
