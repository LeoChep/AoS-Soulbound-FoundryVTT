export default class BugReportFormSoulbound extends Application {

    constructor(app) {
        super(app)

        this.endpoint = "https://aa5qja71ih.execute-api.us-east-2.amazonaws.com/Prod/soulbound"

        this.domains = [
            "Soulbound System",
            "Soulbound Core Module",
            "Soulbound Starter Set",
            "Soulbound Champions of Order"
        ]

        this.domainKeys = [
            "age-of-sigmar-soulbound",
            "soulbound-core",
            "soulbound-starter-set",
            "soulbound-order"
        ]

        this.domainKeysToLabel = {
            "age-of-sigmar-soulbound" : "system",
            "soulbound-core" : "core",
            "soulbound-starter-set" : "starter-set",
            "soulbound-order" : "champions-of-order"
        }
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = "bug-report";
        options.template = "systems/age-of-sigmar-soulbound/template/apps/bug-report.html"
        options.classes.push("age-of-sigmar-soulbound", "soulbound-bug-report");
        options.resizable = true;
        options.width = 600;
        options.minimizable = true;
        options.title = "Soulbound Bug Report"
        return options;
    }


    getData() {
        let data = super.getData();
        data.domains = this.domains;
        data.name = game.settings.get("age-of-sigmar-soulbound", "bugReportName")
        return data;
    }

    submit(data) {
        fetch(this.endpoint, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: data.title,
                body: data.description,
                assignees: ["moo-man"],
                labels : data.labels
            })
        })
        .then(res => {
            if (res.status == 201)
            {
                ui.notifications.notify(game.i18n.localize("ImperialPost"))
                res.json().then(json => {
                    console.log(`Thank you for your submission. If you wish to monitor or follow up with additional details like screenshots, you can find your issue here: ${json.html_url}`)
                })
            }
            else 
            {
               ui.notifications.error(game.i18n.localize("ImperialPostError"))
               console.error(res)
            }   

        })
        .catch(err => {
            ui.notifications.error(game.i18n.localize("Something went wrong"))
            console.error(err)
        })
    }

    activateListeners(html) {
        html.find(".bug-submit").click(ev => {
            let data = {};
            let form = $(ev.currentTarget).parents(".bug-report")[0];
            data.domain = $(form).find(".domain")[0].value
            data.title = $(form).find(".bug-title")[0].value
            data.description = $(form).find(".bug-description")[0].value
            data.issuer = $(form).find(".issuer")[0].value
            let label = $(form).find(".issue-label")[0].value;


            if (!data.domain || !data.title || !data.description)
                return ui.notifications.error(game.i18n.localize("BugReport.ErrorForm"))
            if (!data.issuer)
                return ui.notifications.error(game.i18n.localize("BugReport.ErrorName1"))

            if (!data.issuer.includes("@") && !data.issuer.includes("#"))
                return ui.notifications.notify(game.i18n.localize("BugReport.ErrorName2"))

            data.title = `[${this.domains[Number(data.domain)]}] ${data.title}`
            data.description = data.description + `<br/>**From**: ${data.issuer}`

            data.labels = [this.domainKeysToLabel[this.domainKeys[Number(data.domain)]]]

            if (label)
                data.labels.push(label);

            game.settings.set("age-of-sigmar-soulbound", "bugReportName", data.issuer);

            let officialModules = Array.from(game.modules).filter(m => this.domainKeys.includes(m[0]))
            
            let versions = `<br/>age-of-sigmar-soulbound: ${game.system.version}`

            for (let mod of officialModules)
            {
                let modData = game.modules.get(mod[0]);
                if (modData.active)
                    versions = versions.concat(`<br/>${mod[0]}: ${modData.data.version}`)
            }

            data.description = data.description.concat(versions);

            this.submit(data)
            this.close()
        })
    }
}

