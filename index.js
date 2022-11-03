const axios = require("axios");
const https = require("https");
const fs = require("fs");
const AdmZip = require("adm-zip");
const cliProgress = require("cli-progress");
const colors = require("ansi-colors");

const user = "godotengine";
const repo = "godot";

const baseUrl = "https://downloads.tuxfamily.org/godotengine/{{release}}/mono/";
const baseFileName = "Godot_v{{release}}-stable_mono_linux_headless_64.zip";
const baseTemplatesName = "Godot_v{{release}}-stable_mono_export_templates.tpz";
const url = `https://api.github.com/repos/${user}/${repo}/releases/latest`;

const formatBytes = (bytes) => {
    const marker = 1024;
    const decimal = 2;

    const kiloBytes = marker;
    const megaBytes = marker * marker;
    const gigaBytes = marker * marker * marker;

    if (bytes < kiloBytes)
        return bytes + " Bytes";
    
    else if (bytes < megaBytes)
        return (bytes / kiloBytes).toFixed(decimal) + " KB";
    
    else if (bytes < gigaBytes)
        return (bytes / megaBytes).toFixed(decimal) + " MB";
    
    else
        return (bytes / gigaBytes).toFixed(decimal) + " GB";
}

const capStringLength = (str, len) => {
    if (str.length <= len) return str;
    return str.substring(0, len - 6) + "..." + str.substring(str.length - 3, str.length);
};

const main = async () => {
    const release = (await axios.get(url)).data;
    const releaseId = release.name;
    const releaseVersion = releaseId.split("-")[0];

    const fileName = baseFileName.replace("{{release}}", releaseVersion);
    const templatesFileName = baseTemplatesName.replace("{{release}}", releaseVersion);

    const releaseUrl = baseUrl.replace("{{release}}", releaseVersion) + fileName;
    const templatesUrl = baseUrl.replace("{{release}}", releaseVersion) + templatesFileName;

    const file = fs.createWriteStream(fileName);

    await new Promise((resolve) => {
        https.get(releaseUrl, (res) => {
            const bar = new cliProgress.SingleBar({
                format: (o, p, pa) => {
                    const bar = cliProgress.Format.BarFormat(p.progress, o);
                    const eta = cliProgress.Format.TimeFormat(p.eta, o);
                    const percentage = ((p.value / p.total) * 100).toFixed(0);

                    return `${pa.title} [${colors.cyan(bar)}] ${percentage}% || ${formatBytes(p.value)} / ${formatBytes(p.total)} || ETA: ${eta}`;
                },

                barCompleteChar: "#",
                barIncompleteChar: "-",
                hideCursor: true,
            });

            let data = "";
            let total = parseInt(res.headers["content-length"]) || 0;

            bar.start(total, 0, {
                title: capStringLength(fileName, 24),
            });

            res.on("data", (d) => {
                data += d;

                bar.update(data.length);
                bar.updateETA();
            });

            res.pipe(file);

            file.on("finish", () => {
                bar.update(bar.getTotal());
                bar.updateETA();
                bar.stop();

                file.close();

                resolve(true);
            });
        });
    });

    const templatesFile = fs.createWriteStream(templatesFileName);

    await new Promise((resolve) => {
        https.get(templatesUrl, (res) => {
            const bar = new cliProgress.SingleBar({
                format: (o, p, pa) => {
                    const bar = cliProgress.Format.BarFormat(p.progress, o);
                    const eta = cliProgress.Format.TimeFormat(p.eta, o);
                    const percentage = ((p.value / p.total) * 100).toFixed(0);

                    return `${pa.title} [${colors.cyan(bar)}] ${percentage}% || ${formatBytes(p.value)} / ${formatBytes(p.total)} || ETA: ${eta}`;
                },

                barCompleteChar: "#",
                barIncompleteChar: "-",
                hideCursor: true,
            });

            let data = "";
            let total = parseInt(res.headers["content-length"]) || 0;

            bar.start(total, 0, {
                title: capStringLength(templatesFileName, 24),
            });

            res.on("data", (d) => {
                // data += d;

                bar.increment(d.length);
                bar.updateETA();
            });

            res.pipe(templatesFile);

            templatesFile.on("finish", () => {
                bar.update(bar.getTotal());
                bar.updateETA();
                bar.stop();

                templatesFile.close();

                resolve(true);
            });
        });
    });

    const zip = new AdmZip(fileName);
    await zip.extractAllToAsync(".");

    const templatesZip = new AdmZip(templatesFileName);
    await templatesZip.extractAllToAsync(".");

    fs.rmSync(fileName);

    const folderName = fileName.replace(".zip", "");
    const templatesFolderName = "templates";
    
    const godotBinariesName = "GodotSharp";
    const executableName = folderName.replace("headless_64", "headless.64");

    if (fs.existsSync(folderName + "/" + executableName))
        console.log("> Found executable at: " + folderName + "/" + executableName);

    if (fs.existsSync(folderName + "/" + godotBinariesName))
        console.log("> Found libraries at: " + folderName + "/" + godotBinariesName);
    
    console.log("[INFO] Copying files...");

    fs.renameSync(folderName + "/" + executableName, folderName + "/godot");
    fs.chmodSync(folderName + "/godot", 0o0755);

    fs.renameSync(folderName + "/godot", "deb/usr/bin/godot");
    fs.renameSync(folderName + "/" + godotBinariesName, "deb/usr/bin/" + godotBinariesName);

    if (fs.existsSync("deb/etc/godot/templates"))
        fs.rmSync("deb/etc/godot/templates", { recursive: true, force: true });

    fs.renameSync("templates", "deb/etc/godot/templates");
    fs.rmSync(folderName, { recursive: true });
};

main();
