//DESCRIPTION:press2id – Access WordPress Sites
//Author: Gregor Fellenz - http://www.publishingx.de

var RunModes = {
    PLACE_GUN: "placeGun",
    TEMPLATE: "template",
    DATABASE: "database"
}

//@include config/defaultConfig.jsx
// //@include config/wirindortmund.jsx //removeDefault

//<remove>
try {
    px.projectName = app.activeScript.name;
}
catch (e) {
    /* We're running from the VSC */
    px.projectName = File(e.fileName).name;
}
px.projectName = px.projectName.replace(/\.jsx$/, "");
//</remove>



var jsonFieldType = {
    TEXT: "TEXT",
    GRAPHIC: "GRAPHIC"
}

//@include "lib/json2.js"
//@include "lib/idsLog.jsx"
//@include "lib/restix.jsx"
//@include "lib/Base64.jsx"
//@include "lib/encoder.js"
//@include "lib/pjxml.js"

main();

function main() {
    var ui = {}
    ui.noTemplate = { en: "Could not find a template file in folder [templates] next to the script.", de: "Es konnte keine Vorlagendatei im Ordner [templates] neben dem Skript gefunden werden." };


    if (app.documents.length == 0) {
        alert("Kein Dokument geöffnet", "Hinweis");
        return;
    }
    if (app.layoutWindows.length == 0) {
        alert("Kein Dokument sichtbar", "Hinweis");
        return;
    }

    // Init Log
    initLog();

    createProgressbar();

    progressbar.init(px.projectName, 3); // title, max
    progressbar.step("Teste Internet Verbindung 1/3");

    if (!isOnline()) {
        log.warn(localize({ de: "Kein Internetzugang", en: "No internet access" }));
        log.showWarnings();
        return;
    }

    var historyConfigObject = app.extractLabel("px:press2idConfig");
    if (historyConfigObject != "") {
        log.info("Found old config");
        historyConfigObject = JSON.parse(historyConfigObject);
        if (historyConfigObject.version === configObject.version) {
            configObject = historyConfigObject;
            if (configObject.styleTemplateFile && File(configObject.styleTemplateFile).exists) {
                configObject.styleTemplateFile = File(configObject.styleTemplateFile);
            }
            if (configObject.localImageFolder && Folder(configObject.localImageFolder).exists) {
                configObject.localImageFolder = Folder(configObject.localImageFolder);
            }
        }
        else {
            log.info("saved config object has an old version is ignored!");
        }
        configObject.siteURL = undefined;
        configObject.restURL = undefined;
    }

    progressbar.step("Seitendaten laden 2/3");

    var result = getConfig(configObject);
    if (result != null) {
        configObject = result;
        log.info("User Ok, Write Config to app");

        // TODO bring to Config Panel -> Option to select a template
        var templateFile = getTemplateFile(configObject);
        if (templateFile == null) {
            log.warn(localize(ui.noTemplate));
            return false;
        }
        configObject.styleTemplateFile = templateFile;
        configObject.localImageFolder = (configObject.localImageFolder && configObject.localImageFolder.constructor.name == "Folder" && configObject.localImageFolder.exists) ? configObject.localImageFolder.fullName : undefined;
        app.insertLabel("px:press2idConfig", JSON.stringify(configObject));
        configObject.styleTemplateFile = (configObject.styleTemplateFile) ? File(configObject.styleTemplateFile) : undefined;
        configObject.localImageFolder = (configObject.localImageFolder) ? Folder(configObject.localImageFolder) : undefined;
    }
    else {
        log.info("User Cancel");
        return;
    }

    var ial = app.scriptPreferences.userInteractionLevel;
    var redraw = app.scriptPreferences.enableRedraw;
    var scriptPrefVersion = app.scriptPreferences.version;

    try {
        app.scriptPreferences.userInteractionLevel = UserInteractionLevels.NEVER_INTERACT;
        app.scriptPreferences.enableRedraw = false;
        app.scriptPreferences.version = parseInt(app.version);

        var dok = app.documents[0].getElements()[0];
        log.info("Verarbeite Datei: " + dok.name);
        dok = findDocumentPath(dok);

        if (dok && dok.isValid) {
            var oldValues = setDefaultValues(dok);
            processDok(dok);
        }
    }
    catch (e) {
        log.warn(e);
    }
    finally {
        // dok.close(SaveOptions.NO);
        if (dok && dok.isValid) {
            setValues(dok, oldValues);
        }
        app.scriptPreferences.userInteractionLevel = ial;
        app.scriptPreferences.enableRedraw = redraw;
        app.scriptPreferences.version = scriptPrefVersion;
        app.findGrepPreferences = NothingEnum.NOTHING;
        app.changeGrepPreferences = NothingEnum.NOTHING;
    }

    if (log.getCounters().warn > 0) {
        log.showWarnings();
    }
    //~ 	else {
    //~ 		log.infoAlert("Fertig");
    //~ 	}
    log.info("Skriptlauf Ende");
    log.elapsedTime();
    try {
        app.activate();
    }
    catch (e) { }
}

function processDok(dok) {
    var ui = {}
    ui.couldNotOpenTemplate = { en: "Could not open Template %1", de: "Konnte Template %1 nicht öffnen." };
    ui.progressBarInit = { en: "Process %1 entries. %2", de: "Verarbeite %1 Einträge. %2" };
    ui.progressBarProcess = localize({ en: "Load data from: ", de: "Lade Daten von: " });
    ui.progressBarPlace = localize({ en: "Place: ", de: "Platziere: " });
    ui.missingMasterSpreadStart = localize({ en: "A masterspread with the name [" + configObject.masterSpreadStart + "] is required.", de: "Es wird eine Musterseite mit dem Namen [" + configObject.masterSpreadStart + "] benötigt." });
    ui.missingMasterSpreadFollow = localize({ en: "A masterspread with the name [" + configObject.missingMasterSpreadFollow + "] is required to place several posts.", de: "Für die Platzierung von mehreren Posts wird eine Musterseite mit dem Namen [" + configObject.missingMasterSpreadFollow + "] benötigt." });
    ui.missingContentTextFrame = localize({ en: "There is no text frame named [content] on the masterspread [" + configObject.masterSpreadStart + "]", de: "Auf der Musterseite [" + configObject.masterSpreadStart + "] ist kein Textrahmen mit dem Namen [content] enthalten." });
    ui.missingFeaturedImageFrame = localize({ en: "There is no text frame named [featured-image] on the masterspread [" + configObject.masterSpreadStart + "]", de: "Auf der Musterseite [" + configObject.masterSpreadStart + "] ist kein Textrahmen mit dem Namen [featured-image] enthalten." });
    ui.missingDataFields = localize({ en: "No data field (<<data field name>> or named graphics frame) could be found in the current document!", de: "Im aktuellen Dokument konnt kein Datenfeld (<<Datenfeldname>> oder benannter Grafikrahmen) gefunden werden!" });
    ui.undefinedACFBlock = localize({ en: "JSON Object has no acf property. You need the Plugins https://wordpress.org/plugins/advanced-custom-fields/ and https://de.wordpress.org/plugins/acf-to-rest-api/", de: "Die Eigenschaft acf konnte nicht im JSON Objekt gefunden werden. Du brauchst das Plugin https://wordpress.org/plugins/advanced-custom-fields/ und https://de.wordpress.org/plugins/acf-to-rest-api/" });
    ui.invalidGraphicDatafiled = { en: "Datafield [%1] has no URL. Cannot place image", de: "Datenfeld [%1] hat keine Eigenschaft url. Das Bild kann nicht platziert werden!" };
    ui.invalidMediaID = { en: "media ID [%1] not found", de: "Medien ID [%1] nicht gefunden!" };

    log.debug(JSON.stringify(configObject));

    // Init
    if (configObject.runMode == RunModes.PLACE_GUN) {
        dok.placeGuns.abortPlaceGun();
        var modeName = localize({ en: "Fill Place Gun", de: "Platzierungs-Einfügemarke befüllen" });
    }
    else if (configObject.runMode == RunModes.TEMPLATE) {
        var templateMasterpread = dok.masterSpreads.itemByName(configObject.masterSpreadStart);
        if (!templateMasterpread.isValid) {
            log.warn(ui.missingMasterSpreadStart);
            return;
        }
        var templateMasterpreadFollow = dok.masterSpreads.itemByName(configObject.masterSpreadFollow);
        if (!templateMasterpreadFollow.isValid) {
            log.warn(ui.missingMasterSpreadFollow);
            return;
        }
        var modeName = localize({ en: "Fill Masterspread", de: "Musterseiten befüllen" });
    }
    else if (configObject.runMode == RunModes.DATABASE) {
        var modeName = localize({ en: "Fill Data Fields", de: "Datenfelder befüllen" });
    }

    if (configObject.runMode == RunModes.PLACE_GUN || configObject.runMode == RunModes.TEMPLATE) {
        try {
            var styleTemplateDok = app.open(configObject.styleTemplateFile, px.debug, OpenOptions.OPEN_COPY);
        }
        catch (e) {
            log.warn(localize(ui.couldNotOpenTemplate, configObject.styleTemplateFile.name));
            log.warn(e);
            return;
        }
    }

    var restURL = configObject.restURL;
    var endPoint = configObject.endPoint;
    progressbar.init(localize(ui.progressBarInit, configObject.selectedPostsArray.length, modeName), configObject.selectedPostsArray.length * 2); // title, max

    // Process selected entries
    for (var r = 0; r < configObject.selectedPostsArray.length; r++) {
        var postObject = configObject.selectedPostsArray[r];
        log.warnInfo("--- Verarbeite [" + postObject.entryTitle + "]");

        try {

            var oneBlogEntry = getSingleEntity(restURL, endPoint, postObject);
            if (oneBlogEntry == null) {
                log.warn("Could not download " + postObject.entryTitle);
                continue;
            }

            if (px.debug) {
                var jsonTempFile = File(log.getLogFolder() + "/download.json");
                writeTextFile(jsonTempFile, JSON.stringify(oneBlogEntry));
            }

            if (postObject.entryTitle.length > 35) {
                var guiTitle = postObject.entryTitle.substring(0, 35) + "...";
            }
            else {
                var guiTitle = postObject.entryTitle
            }

            progressbar.step(ui.progressBarProcess + guiTitle); // label, [step]

            // Prepare Data
            if (configObject.runMode == RunModes.PLACE_GUN) {
                var placeGunArray = [];
            }

            if (configObject.runMode == RunModes.PLACE_GUN || configObject.runMode == RunModes.TEMPLATE) {
                var xmlTempFile = createXMLFile(oneBlogEntry, postObject, restURL);

                // Remove Existing XML
                try {
                    // styleTemplateDok.xmlElements[0].contents = "";
                    untag(styleTemplateDok.xmlElements[0]);
                }
                catch (e) {
                    log.warn(e);
                }

                var xsltFile = File(getScriptFolderPath() + "/templates/" + configObject.xsltFile);
                if (!xsltFile.exists) {
                    log.warn(localize({ en: "Could not locate XSL-File", de: "Konnte XSL-Datei nicht finden" }) + " " + xsltFile);
                }

                // Set Import Preferences
                with (styleTemplateDok.xmlImportPreferences) {
                    allowTransform = true;
                    transformFilename = xsltFile;
                    transformParameters = [];
                    createLinkToXML = false;
                    ignoreUnmatchedIncoming = false;
                    ignoreWhitespace = false;
                    importCALSTables = false;
                    importStyle = XMLImportStyles.APPEND_IMPORT;
                    importTextIntoTables = false;
                    importToSelected = false;
                    removeUnmatchedExisting = true;
                    repeatTextElements = false;
                }

                try {
                    styleTemplateDok.importXML(xmlTempFile);
                }
                catch (e) {
                    log.warn("Die XML-Datei konnte nicht importiert werden! Wahrscheinlich konnte eine HTML-Struktur nicht richtig analysiert werden!");
                    log.warn(e);
                    return;
                }

                var root = styleTemplateDok.xmlElements[0];
                var postXML = root.xmlElements.itemByName("post");
                if (!postXML.isValid) {
                    log.warn("No XML Data in post!");
                    return;
                }

                var startPage = styleTemplateDok.pages[-1];
                var contentFrame = startPage.textFrames.add();
                contentFrame.geometricBounds = [0, 0, 1000, 5000]
                contentFrame.placeXML(postXML);

                // Absatzformate anwenden
                blocks = postXML.evaluateXPathExpression("//*[@pstyle]");
                log.debug("Block Elemente mit @pstyle " + blocks.length);
                for (i = 0; i < blocks.length; i++) {
                    node = blocks[i];
                    var pStyleName = node.xmlAttributes.itemByName("pstyle").value;
                    var pStyle = getStyleByString(styleTemplateDok, pStyleName, "paragraphStyles");
                    if (!pStyle.isValid) {
                        log.warn("Absatzformat mit dem Namen [" + pStyleName + "] ist nicht vorhanden!");
                        pStyle = styleTemplateDok.paragraphStyles[0];
                        log.warn("Verwende stattdessen [" + pStyle.name + "]");
                    }
                    node.applyParagraphStyle(pStyle);
                }

                // Zeichenformate anwenden
                blocks = postXML.evaluateXPathExpression("//*[@cstyle]");
                for (i = 0; i < blocks.length; i++) {
                    node = blocks[i];
                    cStyleName = node.xmlAttributes.itemByName("cstyle").value;
                    cStyle = getStyleByString(styleTemplateDok, cStyleName, "characterStyles");
                    if (!cStyle.isValid) {
                        log.warn("Zeichenformat mit dem Namen [" + cStyleName + "] ist nicht vorhanden!");
                        cStyle = styleTemplateDok.characterStyles[0];
                        log.warn("Verwende stattdessen [" + cStyle.name + "]");
                    }
                    node.applyCharacterStyle(cStyle);
                }

                // Bilder platzieren
                var imgArray = postXML.evaluateXPathExpression("//*[@src]");
                for (var i = 0; i < imgArray.length; i++) {
                    var imgXML = imgArray[i];
                    if (imgXML.xmlAttributes.itemByName("ostyle").isValid) {
                        var oStyleName = imgXML.xmlAttributes.itemByName("ostyle").value;
                        var oStyle = getStyleByString(styleTemplateDok, oStyleName, "objectStyles");
                        if (!oStyle.isValid) {
                            log.info("Create Objectstyle [" + oStyleName + "]")
                            oStyle = styleTemplateDok.objectStyles.add({ name: oStyleName });
                        }
                    }
                    else {
                        // Use markup tag for object style			
                        log.info("Element " + imgXML.markupTag.name + " has now Attribute ostyle, we use the tag name!");
                        var oStyleName = imgXML.markupTag.name;
                        var oStyle = styleTemplateDok.objectStyles.itemByName(oStyleName);
                        if (!oStyle.isValid) {
                            log.info("Create Objectstyle [" + oStyleName + "]")
                            oStyle = styleTemplateDok.objectStyles.add({ name: oStyleName });
                        }
                    }

                    var fileURL = imgXML.xmlAttributes.itemByName("src").value;
                    var imageFile = getImageFile(configObject, fileURL)

                    if (imageFile != null && imageFile.exists && imageFile.length > 0) {
                        var rect = styleTemplateDok.rectangles.add();
                        rect.geometricBounds = [0, 0, 500, 94]; // Default if not set in Object style
                        rect.appliedObjectStyle = oStyle;
                        try {
                            rect.place(imageFile);
                        }
                        catch (e) {
                            log.warn("Cannot place " + imageFile.name + "\nError: " + e);
                        }

                        if (rect.getElements()[0] instanceof TextFrame) {
                            log.warn("Found text instead of image data for [" + fileURL + "]");
                            rect.getElements()[0].parentStory.contents = "File not found [" + imageFile + "] The URL [" + fileURL + "] is probably broken?";
                        }

                        rect.fit(FitOptions.PROPORTIONALLY);
                        rect.fit(FitOptions.FRAME_TO_CONTENT);

                        if (configObject.runMode == RunModes.PLACE_GUN && configObject.loadImagesToPlaceGun) {
                            var tempFile = File(Folder.temp + "/px_" + imageFile.name + ".idms");
                            var captionXML = imgXML.parent.xmlElements.itemByName("figcaption");
                            if (!captionXML.isValid) {
                                captionXML = imgXML.parent.parent.xmlElements.itemByName("figcaption");
                            }
                            if (captionXML.isValid && captionXML.xmlContent.constructor.name == "Text") {
                                // Add Caption to image
                                var captionTf = styleTemplateDok.textFrames.add();
                                if (captionXML.xmlAttributes.itemByName("ostyle").isValid) {
                                    var oStyleName = captionXML.xmlAttributes.itemByName("ostyle").value;
                                    var oStyle = getStyleByString(styleTemplateDok, oStyleName, "objectStyles");
                                    if (!oStyle.isValid) {
                                        log.info("Create Objectstyle [" + oStyleName + "]")
                                        oStyle = styleTemplateDok.objectStyles.add({ name: oStyleName });
                                    }
                                    captionTf.appliedObjectStyle = oStyle;
                                }
                                var rgb = rect.geometricBounds;
                                captionTf.geometricBounds = [rgb[2], rgb[1], rgb[2] + 50, rgb[3]];
                                captionXML.xmlContent.move(LocationOptions.AT_BEGINNING, captionTf);
                                findOrChangeGrep(captionTf, "\\A\\s*", "");
                                findOrChangeGrep(captionTf, "\\s*\\Z", "");
                                captionTf.textFramePreferences.autoSizingReferencePoint = AutoSizingReferenceEnum.TOP_CENTER_POINT;
                                captionTf.textFramePreferences.autoSizingType = AutoSizingTypeEnum.HEIGHT_ONLY;
                                var tgb = captionTf.geometricBounds;
                                captionTf.textFramePreferences.autoSizingType = AutoSizingTypeEnum.OFF;
                                captionTf.geometricBounds = [tgb[0], tgb[1], tgb[2], tgb[3]];
                                var group = styleTemplateDok.groups.add([rect, captionTf]);
                                try {
                                    if (captionTf.parentStory.characters.length > 0) {
                                        group.exportFile(ExportFormat.INDESIGN_SNIPPET, tempFile);
                                        group.remove();
                                    }
                                    else {
                                        // Bildunterschrift war leer
                                        rect.exportFile(ExportFormat.INDESIGN_SNIPPET, tempFile);
                                        rect.remove();
                                        captionTf.remove();
                                    }
                                }
                                catch (e) {
                                    log.warn(e);
                                    log.warn("Problem bei Export der Bilddatei [" + imageFile.name + "]")
                                }
                            }
                            else {
                                try {
                                    rect.exportFile(ExportFormat.INDESIGN_SNIPPET, tempFile);
                                    rect.remove();
                                }
                                catch (e) {
                                    log.warn(e);
                                    log.warn("Problem bei Export der Bilddatei [" + imageFile.name + "]")
                                }
                            }

                            placeGunArray.push(tempFile);
                            px.tempFileArray.push(tempFile);
                        }
                        else {
                            rect.anchoredObjectSettings.insertAnchoredObject(imgXML.xmlContent.insertionPoints[0]);
                            rect.anchoredObjectSettings.properties = rect.appliedObjectStyle.anchoredObjectSettings.properties;
                            // rect.clearObjectStyleOverrides(); // Geht nicht, weil die Größe über das Objektformat gesteuert werden soll
                            // TODO fix image height > textFrame height
                        }
                    }
                    else {
                        log.warn("Could not download/find image URL [" + fileURL + "]");
                    }
                }

                var currentEntryStory = contentFrame.parentStory;

                app.findGrepPreferences = NothingEnum.NOTHING;
                app.changeGrepPreferences = NothingEnum.NOTHING;
                // Fix mehrere Leerzeichen 
                app.findGrepPreferences.findWhat = " (?= )";
                app.changeGrepPreferences.changeTo = "";
                currentEntryStory.changeGrep();
                // Fix whitespace at beginning of paragraph
                app.findGrepPreferences.findWhat = "^\\h+";
                app.changeGrepPreferences.changeTo = "";
                currentEntryStory.changeGrep();
                // Fix forced Line break at end of paragraph
                app.findGrepPreferences.findWhat = "\\n(?=\\r)";
                app.changeGrepPreferences.changeTo = "";
                currentEntryStory.changeGrep();
                // Fix empty lines
                app.findGrepPreferences.findWhat = "\\r\\h*(?=\\r)";
                app.changeGrepPreferences.changeTo = "";
                currentEntryStory.changeGrep();
                // Fix empty lines
                app.findGrepPreferences.findWhat = "^\\t+~b";
                app.changeGrepPreferences.changeTo = "";
                currentEntryStory.changeGrep();

                // Create Hyperlinks 
                var hyperlinkNodes = postXML.evaluateXPathExpression("//hyperlink");
                for (var h = 0; h < hyperlinkNodes.length; h++) {
                    try {
                        var node = hyperlinkNodes[h];
                        var url = node.xmlAttributes.itemByName("href").value;
                        var quelle = styleTemplateDok.hyperlinkTextSources.add(node.xmlContent.texts[0]);
                        var urlDestination = styleTemplateDok.hyperlinkURLDestinations.itemByName(url);
                        if (!urlDestination.isValid) urlDestination = styleTemplateDok.hyperlinkURLDestinations.add(url, { name: url });
                        var hlink = styleTemplateDok.hyperlinks.add(quelle, urlDestination);
                        hlink.name = url;
                    }
                    catch (e) {
                        if (e.number == 79110) {
                            log.info("Hyperlink Name [" + url + "] already used.");
                        }
                        else {
                            log.warn(e);
                        }
                    }
                }

                if (!px.debug && configObject.selectedPostsArray.length == 1) {
                    untag(root);
                }

                findOrChangeGrep(currentEntryStory, "\\A\\s*", "");
                fixStoryEnd(currentEntryStory);

            }
            else if (configObject.runMode == RunModes.DATABASE) {
                var singleACFBlock = oneBlogEntry.acf;
                if (singleACFBlock == undefined) {
                    log.warn(ui.undefinedACFBlock + " " + postObject.id + " " + postObject.entryTitle);
                    continue;
                }
            }

            progressbar.step(ui.progressBarPlace + postObject.entryTitle); // label, [step]

            // Place data in destination
            if (configObject.runMode == RunModes.PLACE_GUN) {

                // Export to TEMP ICML
                var oldUserName = app.userName;
                log.debug("Setze einen generischen userName = press2id, war vorher " + oldUserName);
                app.userName = "press2id";
                try {
                    currentEntryStory.insertLabel(px.postIDLabel, postObject.id + "");
                    var tempICMLFile = File(Folder.temp + "/" + new Date().getTime() + Math.random().toString().replace(/\./, '') + "temp.icml");
                    currentEntryStory.exportFile(ExportFormat.INCOPY_MARKUP, tempICMLFile);
                    placeGunArray.unshift(tempICMLFile);
                    try {
                        app.activeDocument = dok;
                        dok.placeGuns.loadPlaceGun(placeGunArray);
                    }
                    catch (e) {
                        // // Windows Async File Export Problems (Error: Die Datei existiert nicht bzw. wird von einer anderen Anwendung verwendet, oder Sie haben nicht die entsprechenden Zugriffsrechte.)
                        if (e.number == 29446) {
                            placeGunArray.shift();
                            var nexTempFile = File(Folder.temp + "/" + new Date().getTime() + Math.random().toString().replace(/\./, '') + "temp.icml");
                            tempICMLFile.copy(nexTempFile);
                            placeGunArray.unshift(nexTempFile);
                            dok.placeGuns.loadPlaceGun(placeGunArray);
                            // for (var i = 0; i < placeGunArray.length; i++) {
                            //     if (!placeGunArray[i].exists) throw e;
                            // }
                        }
                        else {
                            throw e;
                        }
                    }
                    try {
                        dok.links.itemByName(tempICMLFile.name).unlink();
                        styleTemplateDok.links.everyItem().unlink();
                        tempICMLFile.remove();
                        for (var g = 0; g < px.tempFileArray.length; g++) {
                            px.tempFileArray[g].remove();
                        }
                    }
                    catch (e) {
                        // we don't care about temp files ... 
                        log.info(e);
                    }
                }
                catch (e) {
                    log.warn(e);
                }
                finally {
                    try {
                        app.userName = oldUserName;
                    }
                    catch (e) {
                        log.info("Konnte User Name nicht auf " + oldUserName + " setzen!");
                        if (e.number != 41993) {
                            log.warn(e);
                        }
                    }
                }
            }
            else if (configObject.runMode == RunModes.TEMPLATE) {
                // Wenn das Template nur eine Seite enthält, wird diese zum Einstieg verwendet. Ansonsten wird eine neue Seite hinten angehangen
                if (configObject.startPage == "NEXT") {
                    if (r == 0 && dok.pages.length == 1) {
                        var page = dok.pages[0];
                    }
                    else {
                        var page = dok.pages.add();
                    }
                }
                else if (configObject.startPage == "LEFT") {
                    if (dok.pages[-1].side == PageSideOptions.LEFT_HAND) {
                        dok.pages.add();
                    }
                    var page = dok.pages.add();
                    page.appliedMaster = templateMasterpread;
                }
                else if (configObject.startPage == "RIGHT") {
                    if (dok.pages[-1].side == PageSideOptions.RIGHT_HAND) {
                        dok.pages.add();
                    }
                    var page = dok.pages.add();
                    page.appliedMaster = templateMasterpread;
                }


                if (postObject.featuredImageURL) {
                    if (page.side == PageSideOptions.RIGHT_HAND) {
                        var fiRect = templateMasterpread.pages[1].pageItems.itemByName("featured-image").getElements()[0];
                    }
                    else {
                        var fiRect = templateMasterpread.pages[0].pageItems.itemByName("featured-image").getElements()[0];
                    }

                    if (fiRect.isValid) {
                        var gb = fiRect.geometricBounds;
                        var rect = fiRect.override(page);
                        rect.geometricBounds = gb;
                    }
                    else {
                        log.warn(ui.missingFeaturedImageFrame);
                        return;
                    }
                    var imageFile = getImageFile(configObject, postObject.featuredImageURL);

                    if (imageFile != null && imageFile.exists && imageFile.length > 0) {
                        try {
                            rect.place(imageFile);
                            rect.fit(FitOptions.PROPORTIONALLY);
                        }
                        catch (e) {
                            log.warn(e);
                        }
                    }
                }

                page.appliedMaster = templateMasterpread;
                if (page.side == PageSideOptions.RIGHT_HAND) {
                    var textFrameContent = templateMasterpread.pages[1].textFrames.itemByName("content");
                }
                else {
                    var textFrameContent = templateMasterpread.pages[0].textFrames.itemByName("content");
                }
                if (textFrameContent.isValid) {
                    var gb = textFrameContent.geometricBounds;
                    var tf = textFrameContent.override(page);
                    tf.geometricBounds = gb;
                }
                else {
                    log.warn(ui.missingContentTextFrame);
                    return;
                }

                currentEntryStory.move(LocationOptions.AT_BEGINNING, tf.insertionPoints[0]);

                if (configObject.fixOverflow) {

                    var story = tf.parentStory
                    var lastTextContainer = story.textContainers[story.textContainers.length - 1];

                    while (lastTextContainer.overflows) {
                        var page = dok.pages.add();
                        page.appliedMaster = templateMasterpreadFollow;

                        if (page.side == PageSideOptions.RIGHT_HAND) {
                            var textFrameContent = templateMasterpreadFollow.pages[1].textFrames.itemByName("content");
                        }
                        else {
                            var textFrameContent = templateMasterpreadFollow.pages[0].textFrames.itemByName("content");
                        }
                        if (textFrameContent.isValid) {
                            var gb = textFrameContent.geometricBounds;
                            var tf = textFrameContent.override(page);
                            tf.geometricBounds = gb;
                        }
                        else {
                            log.warn(ui.missingContentTextFrame);
                            return;
                        }

                        lastTextContainer.nextTextFrame = tf;
                        lastTextContainer = tf;
                    }
                }
            }
            else if (configObject.runMode == RunModes.DATABASE) {
                dok.pages[0].duplicate(LocationOptions.AT_END);
                px.removeFirstPage = true;
                var lastPage = dok.pages[-1];
                var jsonDatenfelder = getDatenfelder(lastPage);
                if (jsonDatenfelder.length == 0) {
                    log.warn(ui.missingDataFields)
                }
                for (var d = 0; d < jsonDatenfelder.length; d++) {
                    var datenFeld = jsonDatenfelder[d];
                    log.debug(datenFeld.fieldName);
                    if (datenFeld.type == jsonFieldType.TEXT) {
                        if (singleACFBlock[datenFeld.fieldName] != undefined) {
                            var setThisString = singleACFBlock[datenFeld.fieldName];
                            if (setThisString.constructor.name == "Object" && setThisString.title != undefined) {
                                setThisString = setThisString.title;
                            }
                            // var startIndex = datenFeld.object.insertionPoints[0].index;
                            // var dataFieldLength = setThisString.length - 1;
                            datenFeld.object.contents = setThisString.toString().replace(/<br>/, "\n");
                        }
                        else {
                            log.warn("Datenfeld [" + datenFeld.fieldName + "] ist nicht in JSON-Datensatz enthalten!");
                        }
                    }
                    if (datenFeld.type == jsonFieldType.GRAPHIC) {
                        if (singleACFBlock[datenFeld.fieldName] != undefined) {
                            var graphicObject = singleACFBlock[datenFeld.fieldName];

                            if (!graphicObject.hasOwnProperty("url")) {
                                if (graphicObject.constructor.name == "Number") {
                                    var request = {
                                        url: restURL + "media",
                                        command: graphicObject + "",
                                        headers: px.defaultHeader
                                    }
                                    var response = restix.fetch(request);
                                    try {
                                        if (response.error) {
                                            throw Error(response.errorMsg);
                                        }
                                        var urlObject = JSON.parse(response.body);
                                        url = urlObject.source_url;
                                    }
                                    catch (e) {
                                        var msg = "Could not connect to\n" + restURL + "\n\n" + e;
                                        log.info(msg);
                                        log.info(e);
                                        log.warn(localize(ui.invalidMediaID, graphicObject + ""));
                                        continue;
                                    }

                                }
                                else {
                                    var url = graphicObject.toString();
                                    if (url.indexOf("http") != 0) {
                                        log.warn(localize(ui.invalidGraphicDatafiled, datenFeld.fieldName));
                                        continue;
                                    }
                                }
                            }
                            else {
                                var url = graphicObject.url;
                            }
                            var imageFile = getImageFile(configObject, url);

                            if (imageFile != null && imageFile.exists && imageFile.length > 0) {
                                try {
                                    datenFeld.object.place(imageFile);
                                    datenFeld.object.name = "";
                                }
                                catch (e) {
                                    log.warn(e);
                                }
                            }
                            else {
                                log.warn("Could not download/find image URL [" + fileURL + "]");
                            }
                            datenFeld.object.clearObjectStyleOverrides();
                        }
                        else {
                            log.warn("Datenfeld [" + datenFeld.fieldName + "] ist nicht in JSON-Datensatz enthalten!");
                        }
                    }
                }
            }
        }
        catch (e) {
            log.warn(e);
        }
    }

    progressbar.close();

    if (configObject.runMode == RunModes.PLACE_GUN || configObject.runMode == RunModes.TEMPLATE) {
        styleTemplateDok.close(SaveOptions.NO);
    }

    if (configObject.runMode == RunModes.DATABASE && px.removeFirstPage) {
        dok.pages[0].remove();
    }

}

function fixStoryEnd(story) {
    try {
        var lastCharCounter = -1
        var lastChar = story.characters[lastCharCounter]
        while (lastChar.isValid) {
            if (lastChar.contents == "\r") {
                lastChar.contents = "";
                break;
            }
            else if (lastChar.contents == "\uFEFF") {
                lastCharCounter--;
                lastChar = story.characters[lastCharCounter]
            }
            else {
                break;
            }
        }
    }
    catch (e) {
        log.warn(e);
    }
}

function getImageFile(configObject, fileURL) {
    if (!fileURL.match(/^http/)) {
        fileURL = configObject.siteURL + fileURL;
    }
    // fix to unscaled version if available
    var scaleRegex = /-\d+x\d+(\.[a-z]+)$/i

    if (fileURL.match(scaleRegex)) {
        var fixedURL = fileURL.replace(scaleRegex, "$1");
        if (configObject.downloadImages) {
            var request = {
                url: fixedURL,
                headers: px.defaultHeader,
                method: "HEAD"
            }

            var response = restix.fetch(request);
            if (response.httpStatus == 200) {
                log.info("Ersetze URL [" + fileURL + "] mit Highres URL [" + fixedURL + "]");
                fileURL = fixedURL;
            }
        }
        else {
            fileURL = fixedURL;
        }
    }
    var fileName = getFileNameFromURL(fileURL);

    if (configObject.downloadImages) {
        // Bilder herunterladen
        var linkPath = Folder(px.documentFolder + "/Links");
        linkPath.create();
        if (!linkPath.exists) {
            log.warn("Could not find or create Folder [Links] next to document. Script will use Desktop to download links instead!");
            linkPath = Folder.desktop;
        }
        log.info("Download image from URL " + fileURL);
        var imageFile = File(linkPath + "/" + fileName);

        var lastSlash = fileURL.lastIndexOf("/");
        var baseUrl = fileURL.substring(0, lastSlash + 1); // includes the last slash
        var filename = fileURL.substring(lastSlash + 1);
        filename = filename.replace(/\?.+?$/, "");
        
        log.info("Base URL: " + baseUrl + "\nFilename: " + filename);

        var request = {
            url: baseUrl,
            command: filename,
            headers: px.defaultHeader
        }

        var response = restix.fetchFile(request, imageFile);
        if (response.error) {
            log.warn("Error while download image [" + fileName + "]\nfrom URL [" + fileURL + "]\nto local file [" + imageFile + "]\n" + response.errorMsg + "\n" + response.httpStatus);
            return null;
        }
        if (response.httpStatus == 404) {
            log.warn("Error while download image [" + fileName + "]\nfrom URL [" + fileURL + "]\nto local file [" + imageFile + "]\n" + response.httpStatus);
            return null;
        }
    }
    else {
        var imageFile = File(configObject.localImageFolder + "/" + fileName);
        log.info("Link to local folder " + imageFile);
    }

    // Check for 404 Images
    if (imageFile.exists && imageFile.length < 10000) {
        var canOpen = imageFile.open("r");
        if (canOpen) {
            var contents = imageFile.read();
            if (contents.match(/<body class="error404/)) {
                log.warn("Found an 404 Image: [" + fileURL + "]");
                imageFile.remove();
                return null;
            }
        }
    }

    return imageFile;
}

function getSingleEntity(blogURL, endPoint, postObject) {

    var request = {
        url: blogURL,
        command: endPoint + "/" + postObject.id,
        headers: px.defaultHeader
    }
    var response = restix.fetch(request);
    try {
        if (response.error) {
            throw Error(response.errorMsg);
        }
        var singlePost = JSON.parse(response.body);
    }
    catch (e) {
        log.warn(e)
        return null;
    }

    if (singlePost.hasOwnProperty("code")) {
        log.warn("Es konnte kein Beitrag heruntergeladen werden:\nCode: " + singlePost.code + " Message: " + singlePost.message);
        return null;
    }

    if (singlePost.length == 0) {
        log.warn("Der Beitrag mit der ID [" + postObject.id + "] konnte nicht heruntergeladen werden!");
        return null;
    }
    return singlePost;
}

function createXMLFile(singlePost, postObject, blogURL) {

    // HTML zusammenbauen
    var htmlString = '<html><head><title>' + postObject.id + '</title>'
    if (singlePost.acf != undefined) {
        for (prop in singlePost.acf) {
            htmlString += '<acf name="' + prop + '">' + singlePost.acf[prop] + '</acf>';
        }
    }
    htmlString += '</head><body>'


    // Featured Image einbinden
    if (configObject.downloadFeaturedImage && singlePost.featured_media != 0 && singlePost.featured_media != undefined) {
        log.info("Post has featured media with media ID " + singlePost.featured_media);
        var request = {
            url: blogURL,
            command: "media/" + singlePost.featured_media,
            headers: px.defaultHeader
        }
        var response = restix.fetch(request);
        try {
            if (response.error) {
                throw Error(response.errorMsg);
            }
            var featuredImage = JSON.parse(response.body);
        }
        catch (e) {
            log.warn(e)
            return;
        }

        if (featuredImage.hasOwnProperty("code")) {
            log.warn("Beitragsbild/FeaturedImage [" + blogURL + "media/" + singlePost.featured_media + "] für " + postObject.entryTitle + " konnte nicht geladen werden. Code: " + featuredImage.code + " Message: " + featuredImage.message);
            postObject.featuredImageURL = null;
        }
        else {
            if (configObject.runMode == RunModes.PLACE_GUN) {
                htmlString += '<figure id="featuredImage">';
                htmlString += '<img src="' + featuredImage.source_url + '" />';
                htmlString += '<figcaption>' + featuredImage.caption.rendered + '</figcaption>';
                htmlString += '</div>';
            }
            else { //if (configObject.runMode ==  RunModes.TEMPLATE) {
                postObject.featuredImageURL = featuredImage.source_url;
            }
        }

    }
    if (singlePost.content != undefined && singlePost.content.rendered != undefined) {
        htmlString += '<div id="content"><h1 class="title">' + singlePost.title.rendered + '</h1>\r' + singlePost.content.rendered + '</div>'
    }
    //Warnung wenn kein Content
    if (!(singlePost.featured_media != 0 && singlePost.featured_media != undefined) &&
        !(singlePost.content != undefined && singlePost.content.rendered != undefined)
    ) {
        log.warn("No content in [" + postObject.entryTitle + "]");
    }
    htmlString += '</body></html>';

    // Fix self closing tags before parse
    htmlString = htmlString.replace(/<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr|command|keygen|menuitem)\s*([^>]*?)\s*\/?\s*>/g, '<$1 $2/>');
    htmlString = htmlString.replace(/<\/(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr|command|keygen|menuitem)>/g, '');
    // remove script
    htmlString = htmlString.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '');
    // remove iframe
    htmlString = htmlString.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/g, '');

    htmlString = htmlString.replace(/class="[^"]*wp-block-gallery[^"]*"/g, 'class="wp-block-gallery"');

    // not escaped & in html...
    htmlString = htmlString.replace(/&(?=\s)/, "&amp;");

    var xmlTempFile = File(log.getLogFolder() + "/download.html");
    writeTextFile(xmlTempFile, htmlString);

    var xmlDoc = pjXML.parse(htmlString);
    var xmlString = xmlDoc.xml();
    xmlString = xmlString.replace(/\n/g, " ");

    xmlTempFile = File(log.getLogFolder() + "/download.xml");
    writeTextFile(xmlTempFile, xmlString);

    return xmlTempFile;
}


/* Wirft eine Fehlermeldung nach der angegeben Zeit */
function timeoutFileExistence(processResultFile, seconds) {
    var timeOut = 0;
    while (!processResultFile.exists && timeOut < 120) {
        $.sleep(1000); // 1 Sekunde
        timeOut++;
    }
    log.info("System call successful. Run time " + timeOut + " seconds")
    $.sleep(500);

    if (!processResultFile.exists) {
        throw Error("Timeout. Result file " + processResultFile.name + " does not appear after " + seconds + " seonds run time.\nMight be a slow server connection?");
    }
}

/* Erstellen von Textdateien mit korrektem Linefeed für Bash oder Bat Skripte relevant */
function writeTextFileLocal(file, string, encoding, linefeed) {
    if (file.constructor.name == "String") {
        file = new File(file);
    }
    if (file.constructor.name == "File") {
        try {
            if (linefeed != undefined) {
                file.lineFeed = linefeed;
            }
            if (encoding != undefined) {
                file.encoding = encoding;
            }
            file.open("a");
            file.write(string);
            file.close();
            return true;
        } catch (e) { return e }
    }
    else {
        return Error("This is not a File");
    }
}

function writeTextFile(file, string, encoding) {
    if (encoding == undefined) {
        encoding = "UTF-8";
    }
    if (file.constructor.name == "String") {
        file = new File(file);
    }
    if (file.constructor.name == "File") {
        try {
            file.encoding = encoding;
            file.open("w");
            file.write(string);
            file.close();
            return true;
        } catch (e) {
            return e;
        }
    }
    else {
        return Error("This is not a File");
    }
}

function isOnline() {
    var hasAccess = false;
    var request = {
        url: "https://www.google.de",
        method: "HEAD"
    }
    var response = restix.fetch(request);
    if (response.httpStatus != 200) {
        log.warn("Could not access " + request.url + " httpStatus " + response.httpStatus + " " + response.errorMsg);
    }
    else {
        hasAccess = true;
    }
    if (!hasAccess) {
        var request = {
            url: "https://de.wikipedia.org",
            method: "HEAD"
        }
        var response = restix.fetch(request);
        if (response.httpStatus != 200) {
            log.warn("Could not access " + request.url + " httpStatus " + response.httpStatus + " " + response.errorMsg);
        }
        else {
            hasAccess = true;
        }
    }
    return hasAccess;
}

function getConfig(newConfigObject) {
    var ui = {}
    ui.buttonBlogInfoFetchonClickURLWrong = { en: "URL must start with http:// or https://", de: "URL muss mit http:// oder https:// beginnen" };
    ui.staticTextAftertDate = { en: "After", de: "Nach dem" };
    ui.staticTextBeforeDate = { en: "before", de: "vor dem" };
    ui.staticTextSort = { en: "Sort ", de: "Sortiere" };
    ui.staticTextSortOld = { en: "Old ", de: "Alt" };
    ui.staticTextSortNew = { en: "New ", de: "Neu" };
    ui.staticTextEndpointDescription = { en: "Process", de: "Verarbeite" };
    ui.staticTextEndpointDescriptionInfo = { en: "Posts, Pages or Custom Post Types", de: "Beiträge, Seiten oder Custom Post Types" };
    ui.staticTextCategoryFile = { en: "Filter by category", de: "Kategorie auswählen" };
    ui.panelSelectPost = { en: "Choose one or more entries", de: "Wähle einen oder mehrere Beiträge" };
    ui.panelSelectPostFilter = localize({ en: "[Search in title]", de: "[Im Titel suchen]" });
    ui.imagePanelHead = { en: "Image processing", de: "Bilder verarbeiten" };
    ui.wrongReturnValue = { en: "Something went wrong, could not find Post based on the ID", de: "Etwas ist schiefgelaufen, konnte den Beitrag anhand der ID nicht finden" };
    ui.edittextImageManagementFolderStandardText = { en: "[Select folder ...]", de: "[Ordner wählen ...]" };
    ui.radioImageManagementDownload = { en: "Download from Blog", de: "Vom Blog herunterladen" };
    ui.radioImageManagementLocalFolder = { en: "Link from local folder", de: "Aus lokalem Ordner verknüpfen" };
    ui.edittextImageManagementFolderStandardText = { en: "[Select folder ...]", de: "[Ordner wählen ...]" };
    ui.buttonImageManagementFolderSelect = { en: "Choose", de: "Wählen" };
    ui.buttonImageManagementFolderSelectOnClick = { en: "Select the folder", de: "Wählen Sie den Ordner aus" };
    ui.panelACFFileds = { en: "Fill prepared data fields", de: "Vorbereitete Datenfelder befüllen" };
    ui.staticTextFilterElements = { en: "Filter elements", de: "Auswahl verfeinern" };
    ui.datePatternError = { en: "Wrong Date format YYYY-MM-DD", de: "Falsches Datumsformat JJJJ-MM-TT" };


    var listBounds = [0, 0, 520, 256];
    var listItems = [];
    var etPostFilter;
    var endPointDropdown;
    var categoryDropDown;
    var listboxSelectPost;
    var stNumberOfEntries
    var groupSelectPost;
    var buttonNextMode;
    var filterPanel;
    var loadMaxPages = 1;

    var dialog = new Window("dialog");
    dialog.text = px.projectName + " " + px.version;
    dialog.preferredSize.width = 560;
    dialog.preferredSize.height = 540;
    dialog.orientation = "stack";
    dialog.alignChildren = ["left", "top"];
    dialog.spacing = 10;
    dialog.margins = 10;

    var redBrush = dialog.graphics.newBrush(dialog.graphics.BrushType.SOLID_COLOR, [0.5, 0.0, 0.0]);
    var greenBrush = dialog.graphics.newBrush(dialog.graphics.BrushType.SOLID_COLOR, [0.0, 0.5, 0.0]);


    var geturl = dialog.add("group", undefined, { name: "geturl" });
    geturl.visible = true;
    var processingMode = dialog.add("group", undefined, { name: "processingMode" });
    processingMode.visible = false;
    var filterEntries = dialog.add("group", undefined, { name: "filterEntries" });
    filterEntries.visible = false;
    var optionsPlaceGun = dialog.add("group", undefined, { name: "optionsPlaceGun" });
    optionsPlaceGun.visible = false;
    var optionsTemplate = dialog.add("group", undefined, { name: "optionsTemplate" });
    optionsTemplate.visible = false;
    var optionsDatabase = dialog.add("group", undefined, { name: "optionsDatabase" });
    optionsDatabase.visible = false;
    var optionsTemplate = dialog.add("group", undefined, { name: "optionsTemplate" });
    optionsTemplate.visible = false;
    var imageOptions = dialog.add("group", undefined, { name: "imageOptions" });
    imageOptions.visible = false;

    createGetUrlPanel();
    createModePanel();
    createFilterPanel();
    createOptionsPlaceGun();
    createOptionsImages();
    createOptionsDatabase();
    createOptionsTemplate();

    if (px.siteURL) {
        newConfigObject.basicAuthentication.authenticate = px.authenticate;
        newConfigObject.basicAuthentication.user = px.user;
        newConfigObject.basicAuthentication.password = px.password;

        if (newConfigObject.basicAuthentication.authenticate) {
            px.defaultHeader.push({ name: "Authorization", value: "Basic " + Base64.encode(newConfigObject.basicAuthentication.user + ":" + newConfigObject.basicAuthentication.password) });
        }

        var request = {
            url: px.siteURL,
            method: "HEAD"
        }
        var response = restix.fetch(request);
        if (response.httpStatus != 200) {
            log.warn("Could not access " + request.url + " httpStatus " + response.httpStatus + " " + response.errorMsg);
            return;
        }
        try {
            newConfigObject.siteURL = px.siteURL;
            newConfigObject.restURL = discoverRestURL(px.siteURL);
        }
        catch (e) {
            log.warn(e);
            return;
        }
        geturl.visible = false;
        if (px.runMode) {
            newConfigObject.runMode = px.runMode;
            processingMode.visible = false;
            buttonNextMode.onClick();
            filterEntries.visible = true;
        }
        else {
            processingMode.visible = true;
        }
    }
    progressbar.step("Werte auslesen 3/3");
    progressbar.close();


    var dialogResult = dialog.show();

    if (dialogResult != 2) {
        var selectedPostsArray = [];
        if (listboxSelectPost.selection != null) {
            for (var p = 0; p < listItems.length; p++) {
                for (var s = 0; s < listboxSelectPost.selection.length; s++) {

                    if (listboxSelectPost.selection[s].toString().indexOf(listItems[p].entryTitle + " [" + listItems[p].id + "]") == 0) {
                        selectedPostsArray.push(listItems[p]);
                    }
                }
            }
        }
        else {
            log.info("Nichts ausgewählt!");
        }

        if (selectedPostsArray.length > 0) {
            configObject.selectedPostsArray = selectedPostsArray;
            return configObject;
        }
        else {
            log.warnAlert(localize(ui.wrongReturnValue));
            return null;
        }

    }
    else {
        return null;
    }

    function createGetUrlPanel() {
        // GETURL
        // ======
        geturl.orientation = "column";
        geturl.alignChildren = ["left", "center"];
        geturl.spacing = 10;
        geturl.margins = 0;

        // PANEL1
        // ======
        var panel1 = geturl.add("panel", undefined, undefined, { name: "panel1" });
        panel1.text = "Datenquelle festlegen";
        panel1.preferredSize.width = 540;
        panel1.preferredSize.height = 510;
        panel1.orientation = "column";
        panel1.alignChildren = ["left", "top"];
        panel1.spacing = 10;
        panel1.margins = 10;

        // GROUP1
        // ======
        var group1 = panel1.add("group", undefined, { name: "group1" });
        group1.orientation = "row";
        group1.alignChildren = ["left", "center"];
        group1.spacing = 10;
        group1.margins = [0, 20, 0, 0];

        var statictext1 = group1.add("statictext", undefined, undefined, { name: "statictext1" });
        statictext1.text = "Trage hier die URL der WordPress Seite ein:";

        // GROUP2
        // ======
        var groupBlogInfo = panel1.add("group", undefined, { name: "groupBlogInfo" });
        groupBlogInfo.orientation = "stack";
        groupBlogInfo.alignChildren = ["left", "center"];
        groupBlogInfo.spacing = 10;
        groupBlogInfo.margins = [0, 0, 0, 0];

        var urlListDropdown = groupBlogInfo.add("dropdownlist", undefined, newConfigObject.urlList);
        urlListDropdown.preferredSize.width = 450;
        urlListDropdown.preferredSize.height = 24;
        var edittextBlogInfoURL = groupBlogInfo.add('edittext {text: "' + newConfigObject.urlList[0] + '"}');
        edittextBlogInfoURL.helpTip = "Die URL startet üblicherweise mit https:// ";
        edittextBlogInfoURL.preferredSize.width = 450 - 18;
        edittextBlogInfoURL.preferredSize.height = 24;

        // GROUP3
        // ======
        var group3 = panel1.add("group", undefined, { name: "group3" });
        group3.orientation = "row";
        group3.alignChildren = ["left", "top"];
        group3.spacing = 10;
        group3.margins = [5, 5, 5, 7];

        var infoArea = group3.add("statictext", undefined, undefined, { name: "infoArea", multiline: "true" });
        infoArea.preferredSize.width = 440;
        infoArea.preferredSize.height = 60;
        infoArea.text = "";

        // WIZARDCONTROL
        // =============
        var wizardControl = geturl.add("group", undefined, { name: "wizardControl" });
        wizardControl.orientation = "row";
        wizardControl.alignChildren = ["right", "center"];
        wizardControl.spacing = 10;
        wizardControl.margins = [0, 10, 0, 0];
        wizardControl.alignment = ["fill", "center"];

        var buttonCancel = wizardControl.add("button", undefined, undefined, { name: "cancel" });
        buttonCancel.text = "Abbrechen";

        buttonCancel.onClick = function () {
            dialog.close(2);
        }

        var buttonNext = wizardControl.add("button", undefined, undefined, { name: "ok" });
        buttonNext.text = "Weiter";
        buttonNext.onClick = function () {
            geturl.visible = false;
            processingMode.visible = true;
            buttonNextMode.active = true;
        }

        urlListDropdown.onChange = function () {
            var selectionText = urlListDropdown.selection.text;
            if (newConfigObject.siteURL == selectionText) {
                return;
            }
            edittextBlogInfoURL.text = selectionText;
            edittextBlogInfoURL.onChange();
        }
        edittextBlogInfoURL.onChange = function () {
            if (edittextBlogInfoURL.text == "") {
                buttonNext.enabled = false;
                infoArea.text = "Keine URL eingetragen.";
                group3.graphics.backgroundColor = redBrush;
                return;
            }
            if (newConfigObject.siteURL == edittextBlogInfoURL.text) {
                return;
            }
            if (!edittextBlogInfoURL.text.match(/^https?:\/\//)) {
                infoArea.text = localize(ui.buttonBlogInfoFetchonClickURLWrong);
                group3.graphics.backgroundColor = redBrush;
                return;
            }
            try {
                newConfigObject.siteURL = edittextBlogInfoURL.text;
                newConfigObject.restURL = discoverRestURL(edittextBlogInfoURL.text);
                log.info("siteURL " + newConfigObject.siteURL);
                log.info("Set new REST API restURLs " + newConfigObject.restURL);
                infoArea.text = "Die URL sieht gut aus.\nREST API: " + newConfigObject.restURL;
                group3.graphics.backgroundColor = greenBrush;
                newConfigObject.urlList.unshift(newConfigObject.siteURL);
                newConfigObject.urlList = unique(newConfigObject.urlList);
                newConfigObject.urlList = newConfigObject.urlList.slice(0, 6);
                var found = false;
                for (var g = 0; g < urlListDropdown.items.length; g++) {
                    if (urlListDropdown.items[g].text == newConfigObject.siteURL) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    urlListDropdown.add('item', newConfigObject.siteURL);
                }
                buttonNext.enabled = buttonNext.active = true;
            }
            catch (e) {
                newConfigObject.restURL = undefined
                infoArea.text = "Es gibt ein Problem:\n" + e.toString(); //.replace(/\r|\n/g, " ");
                group3.graphics.backgroundColor = redBrush;
                buttonNext.enabled = buttonNext.active = false;
                return;
            }
        }
        // init!
        edittextBlogInfoURL.onChange();
    }
    function createModePanel() {
        processingMode.orientation = "column";
        processingMode.alignChildren = ["left", "center"];
        processingMode.spacing = 10;
        processingMode.margins = 0;

        var panel1 = processingMode.add("panel", undefined, undefined, { name: "panel1" });
        panel1.text = "Was willst du tun?";
        panel1.preferredSize.width = 540;
        panel1.preferredSize.height = 510;
        panel1.orientation = "column";
        panel1.alignChildren = ["left", "top"];
        panel1.spacing = 10;
        panel1.margins = 10;


        // GROUP3
        // ======
        var group3 = panel1.add("group", undefined, { name: "group3" });
        group3.orientation = "column";
        group3.alignChildren = ["left", "center"];
        group3.spacing = 10;
        group3.margins = [0, 20, 0, 0];

        // GROUP4
        // ======
        var group4 = group3.add("group", undefined, { name: "group4" });
        group4.orientation = "row";
        group4.alignChildren = ["left", "top"];
        group4.spacing = 10;
        group4.margins = [0, 0, 0, 12];

        // GROUP5
        // ======
        var group5 = group4.add("group", undefined, { name: "group5" });
        group5.orientation = "row";
        group5.alignChildren = ["left", "center"];
        group5.spacing = 10;
        group5.margins = [0, 1, 0, 0];

        var rbPlaceGun = group5.add("radiobutton");
        rbPlaceGun.value = newConfigObject.runMode == RunModes.PLACE_GUN;
        rbPlaceGun.preferredSize.width = 18;
        rbPlaceGun.alignment = ["left", "top"];

        // placeGunInfoGroup
        // ======
        var placeGunInfoGroup = group4.add("group", undefined, { name: "placeGunInfoGroup" });
        placeGunInfoGroup.preferredSize.width = 480;
        placeGunInfoGroup.orientation = "column";
        placeGunInfoGroup.alignChildren = ["left", "center"];
        placeGunInfoGroup.spacing = 6;
        placeGunInfoGroup.margins = 0;

        var grpPlaceGun = placeGunInfoGroup.add("group");
        grpPlaceGun.orientation = "column";
        grpPlaceGun.alignChildren = ["left", "center"];
        grpPlaceGun.spacing = 0;
        var stPlaceGun = grpPlaceGun.add("statictext", undefined, "Beiträge in die Platzierungs-Einfügemarke »Place Gun« laden");

        if (app.generalPreferences.hasOwnProperty("uiBrightnessPreference") && app.generalPreferences.uiBrightnessPreference > 0.5) {
            var image1_imgString = "%C2%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00%C3%97%00%00%00%26%08%06%00%00%00W%C2%B3%0E%09%00%00%00%09pHYs%00%00%0B%13%00%00%0B%13%01%00%C2%9A%C2%9C%18%00%00%05%C3%B1iTXtXML%3Acom.adobe.xmp%00%00%00%00%00%3C%3Fxpacket%20begin%3D%22%C3%AF%C2%BB%C2%BF%22%20id%3D%22W5M0MpCehiHzreSzNTczkc9d%22%3F%3E%20%3Cx%3Axmpmeta%20xmlns%3Ax%3D%22adobe%3Ans%3Ameta%2F%22%20x%3Axmptk%3D%22Adobe%20XMP%20Core%206.0-c005%2079.164590%2C%202020%2F12%2F09-11%3A57%3A44%20%20%20%20%20%20%20%20%22%3E%20%3Crdf%3ARDF%20xmlns%3Ardf%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2F02%2F22-rdf-syntax-ns%23%22%3E%20%3Crdf%3ADescription%20rdf%3Aabout%3D%22%22%20xmlns%3Axmp%3D%22http%3A%2F%2Fns.adobe.com%2Fxap%2F1.0%2F%22%20xmlns%3Adc%3D%22http%3A%2F%2Fpurl.org%2Fdc%2Felements%2F1.1%2F%22%20xmlns%3Aphotoshop%3D%22http%3A%2F%2Fns.adobe.com%2Fphotoshop%2F1.0%2F%22%20xmlns%3AxmpMM%3D%22http%3A%2F%2Fns.adobe.com%2Fxap%2F1.0%2Fmm%2F%22%20xmlns%3AstEvt%3D%22http%3A%2F%2Fns.adobe.com%2Fxap%2F1.0%2FsType%2FResourceEvent%23%22%20xmp%3ACreatorTool%3D%22Adobe%20Photoshop%2022.1%20(Windows)%22%20xmp%3ACreateDate%3D%222021-01-13T12%3A25%3A51%2B01%3A00%22%20xmp%3AModifyDate%3D%222021-01-17T07%3A53%3A33%2B01%3A00%22%20xmp%3AMetadataDate%3D%222021-01-17T07%3A53%3A33%2B01%3A00%22%20dc%3Aformat%3D%22image%2Fpng%22%20photoshop%3AColorMode%3D%223%22%20photoshop%3AICCProfile%3D%22sRGB%20IEC61966-2.1%22%20xmpMM%3AInstanceID%3D%22xmp.iid%3Ade2abfbe-b649-b448-b96e-a7572d68c79f%22%20xmpMM%3ADocumentID%3D%22adobe%3Adocid%3Aphotoshop%3A63e2b846-14ec-4c4f-99de-7ebe9eece563%22%20xmpMM%3AOriginalDocumentID%3D%22xmp.did%3A62c469fe-3253-6746-b93f-292b123a260b%22%3E%20%3CxmpMM%3AHistory%3E%20%3Crdf%3ASeq%3E%20%3Crdf%3Ali%20stEvt%3Aaction%3D%22created%22%20stEvt%3AinstanceID%3D%22xmp.iid%3A62c469fe-3253-6746-b93f-292b123a260b%22%20stEvt%3Awhen%3D%222021-01-13T12%3A25%3A51%2B01%3A00%22%20stEvt%3AsoftwareAgent%3D%22Adobe%20Photoshop%2022.1%20(Windows)%22%2F%3E%20%3Crdf%3Ali%20stEvt%3Aaction%3D%22saved%22%20stEvt%3AinstanceID%3D%22xmp.iid%3Ade2abfbe-b649-b448-b96e-a7572d68c79f%22%20stEvt%3Awhen%3D%222021-01-17T07%3A53%3A33%2B01%3A00%22%20stEvt%3AsoftwareAgent%3D%22Adobe%20Photoshop%2022.1%20(Windows)%22%20stEvt%3Achanged%3D%22%2F%22%2F%3E%20%3C%2Frdf%3ASeq%3E%20%3C%2FxmpMM%3AHistory%3E%20%3C%2Frdf%3ADescription%3E%20%3C%2Frdf%3ARDF%3E%20%3C%2Fx%3Axmpmeta%3E%20%3C%3Fxpacket%20end%3D%22r%22%3F%3E%C3%88g%C3%B1%C2%AE%00%00%05%C3%B5IDATx%C2%9C%C3%AD%C2%9D%C3%91%C2%95%C2%9B8%14%C2%86%C2%BF%C3%99%C2%B3%C3%AFC%07%C2%A1%C2%83%C2%A1%C2%83%C3%90A%C3%A8%20%C2%A4%C2%82%C2%9D%C2%AD%60%C3%99%0A%C2%96%C2%AD%20%C2%A4%03R%C3%81%C2%92%0EH%07L%07L%05%C3%9E%07%C2%89%03%C3%88WX%C2%B6%C2%B1%05%C2%B1%C2%BEst4%C3%88W%17%C2%8D%C2%A4%1F%09%C2%81%C3%AC%C2%A7%C3%83%C3%A1%00%C3%80%C3%93%C3%93%13%2B%C2%90%00%C2%91%C3%BE%C2%BBY%C3%83a%C3%A0n%C3%A4%40%C3%86%C3%98~5P%01%C3%BD%1A%C3%8E%C2%87~%C3%B6H%3C%5D!%C2%AE%04%C3%95%18)%C3%B0q%C3%81%C3%AE%07%C3%90%C2%A2%C3%84V%C2%9F%7B%C2%92%C3%80%5D%C2%A8%C2%80%C3%8FB%C3%BAOT%C3%BB%C3%B6%C3%97%C2%9E%20%C2%88%C3%8B%C2%8D%1C(%C2%80%0F%17%C2%9C%C3%AF%0D%C3%95%C2%90%25%2B%5D%11%03ND%C2%A8%0Ba%2C%7C%C2%96%00%C2%9F%16%C3%B2%C3%BE%40%C2%9E%C2%85%C3%B4%C2%9C1%C2%B2%3D%C2%A2%C2%B88%1C%0E%C2%AE%C3%BFx%0At%C3%80a%12Z%C2%94%C3%90R%C3%86%C3%A9%C3%84%C2%94%04%25%C3%86%C3%9A%C3%88%C3%97%C2%A3%1A%3Bp%1F%3A%C3%A6%C3%B5o%0B%3D%C3%AA%C3%82%C3%A7j%7F%40%16%C3%AC%11C%3F%7B%C2%A4%C3%A0*%C2%AE%C3%82%C2%A8%C3%90%C3%8A%C2%B5R'D%C3%9AO%3F%C3%B1S%23%C2%8B2%C2%B0%1E)%C3%AEBIu%C2%9E%C3%A8%C2%8C%3C%C2%AF.%C2%85%C3%B0%C3%9D%C3%91%C2%B7*%C2%AEjR%C2%91%0D%C3%A7%C2%8B%C3%8A%242%7C%C2%B6%04%C2%81%C3%9D%C2%92%14w%C2%A1%24%3AO%C3%84%C3%BC%22%C2%B8%14%0A%C2%97B%C3%B8%C3%AE%C3%A8%5B%14W5%C2%A9%C3%84%C3%92%C2%A9)%C3%9D%C3%89%19%1B%C2%B0%25%08%C3%ACV%C2%A4%C2%B8%C2%8B%C2%ABC%C2%8DD%C3%8D%19y%0A%C2%97B%C3%B8%C3%AE%C3%A8%5B%13W5%C2%A9%C3%80%C3%BC%C2%9C%C3%96t%20%C3%A5%C2%B8%01%C3%9B%C2%95%C3%8F%11P%C2%A4%C2%B8%0B%C3%A5%C2%92P%C2%B8%14%C3%82wG%C3%B7%11~%C2%B3%C3%94E%C3%8E%C2%B84%C3%BB'JhkRs%C2%BC%7C%C3%BF%C3%82%C3%BA%C2%A3c%20%C3%A0%0DI%5C1c'%C3%BF%C3%8E%C2%BC%C3%83G%C3%8C%C3%AF%C2%B9%C3%8Cc%C2%89%C3%848%C3%8E%C2%80g%C2%8B%C3%AD%1F%C2%8C7%C3%95%C2%81%C3%80%C2%BE%11%C2%A6%C2%85%15%C2%A7%C2%97kcm%C3%9B%C2%9C%C2%B0%1DB6%C3%B1%C3%BFz%C3%82%C2%B6%5B%C3%AB%7F%0B%00%C3%A7M%0B%7B%1CW%C3%BF%C3%8E%C3%85%C3%B7%14m%0B%C3%B7%5C%C3%B1B%C3%85w%C2%A8%C3%B9un4%5C%C2%81%5Dd%C2%A5%C3%90XK%C3%A7%C2%B8%C3%95%3D%C3%9E%3D(P%C3%B7%C2%8D%15%C3%87%C2%A3%C2%B5OR%C3%9C%C3%85%C2%95%C3%9E%C2%AA%10%C2%BE%3B%C3%BA%16%C3%84U%C2%9E%C2%A8%C3%BC%C3%88Rw%C2%89%C3%85%3E%C2%B7%C3%98W%16%C3%BBN%C3%87%C3%8DE-%C3%A8%C2%8F%C2%98%C3%A3%11%20%C3%B1W%C2%9C%19)n%C3%82%C2%AA%C2%B4%7D%C3%84e%C2%AB%C2%85%05%C2%AA%C3%BDr%C2%A9%10%C2%BE%3B%C2%BA%C2%8F%60%C3%9Ese%3A%C3%BE%C3%9B%C3%92Pb%C3%85%C2%A1%C2%AE%C3%98oBz%26%C2%A4%0D%0D%C3%B1.%C2%A4%C2%97%3A%C3%BE%C3%88%C3%B5%C3%8F%C3%93%C3%AEIl%1C%3F%C2%A3%3Ahr%C3%AF%C2%82%5CA%C2%A7%C3%A3%C2%9C%C3%A5wE%C2%97%C3%B8%00%7Ce%C2%9F3%C2%8F%C3%95%C2%99%C2%8A%2Ba%7C_%C2%B0D%C2%BDSf%C2%92%2F%C3%B8%C2%AA%C2%84%C2%B4O%C3%88%C2%A3%5D%C2%87%C2%BC2X2%C2%8A4%5D8%C3%97%1E%C3%98%C2%A3%C3%80%60%C2%9D%C3%A7%C2%8DA%60%1C%C2%8B%0B%C3%94%C2%9B%C3%90%3D%C2%B2X%5E%C2%B0%C2%8F(%C2%92%3D%C3%98G%C2%AF%C3%928%1EF%C2%B2%C3%86(%C3%8F%C2%9E%C3%99%C2%AB%C3%80%C3%96%C3%A0%C3%A1%056%15W%C2%AC%C3%A3V%C3%87%C2%B5%25OfI%C3%AFP%C3%82t%C2%B5%C3%AF%C2%99%C2%8F%C2%8E%C2%8Dq%C3%BE%C3%84%C2%92%C3%AFR%22%C3%AD%C3%9B%C3%B5%5E%C3%A2%C2%9C%C3%B0%C3%9F%C3%82y%C2%83%C3%80%1E%14I%5C%C2%9D%C2%8E%7B%C3%A0%C2%9B%C2%90'_%C3%B0W%09i%C2%B6%C2%A9!%C3%8C%17.%C2%86%C2%BF%C3%9B%05%C3%BF%C3%97%C2%90%C2%A0F%5E%1F%0C%02%C2%8B%3D%C2%9D%C3%9F'_y%C3%90%1D%10%C2%92%C2%B8%C2%A6%C3%94B%C3%9A%C3%92%C3%94P%C2%B2%07%C2%B7%C3%8A5%C3%B3%5EzS%C2%BDU%C2%9Ey%C3%9C7P%5E%7D%17%C3%80%07%C2%BF%C2%9F%C3%B8%C2%BCF%C3%9D%0B%3D%1B%C3%A9%19rGI-~2%C3%A4Q-%C3%96%C3%B1w%1E%C3%A3%C3%A1q%C3%A4%C2%BB%007%C2%A4%C3%82%C3%BE%08%C2%A5%C2%BF%5B)6%C3%84T%5C%C2%BD%C3%85%C2%A6B%C2%BD%C2%964%25G%16Wf%C3%B11L%0D%C3%8Ds%C2%A4%3A%C2%AE%C2%85%3C%C3%92%C3%BD%C3%9B%C3%9E)%7C%17%C3%A0%06d%C2%8C%C3%8F%C2%B8%3A%C2%8F%C3%A5%C3%98%1C%C3%93ia%C2%AB%C3%A3%C3%88%C2%B0%C2%A9%C2%84%7C%C3%92%C3%940B%C2%89%C3%A8'%C3%B23%C2%AC%C3%8C8%C2%8E%19%C2%97%C3%BEk%23%1D%C3%96%C2%BF%C3%9Au%C3%88%C3%A5%C2%BA%17_%C3%98%C3%9F%C3%83q%17%5EPm%C3%95%2C%C2%84%C3%B2%C3%9E%C2%85%C3%9A%02%C3%92%C3%88%C2%95%186-J0%C3%A6b%40%C3%86%C2%BC%C3%922%1D%C2%97%C3%9A%C2%879%C3%9Ae%C3%8C%C2%85%C2%9A%C3%AA%C3%B8%3Bs!%0D%C3%A7%C3%AFX%C2%97N%C3%BB%C2%8EW%C3%B6%C2%8B%C3%B6%C3%BB%C3%8F%C3%82%C3%A7_X%7Fg%C3%81%C2%96x%C3%A6%C3%97%C2%BBG%C2%BE%C2%9A%C2%A9%C2%B8Z%1DK%C2%95Tq%C3%9Cyrdq%C3%95%C3%9A%C2%97).sj8%C2%B5%C2%9F%C2%92%1A%C3%A5Y%C2%93%C2%8E%C3%BBO%5D~ua%05%2CL%C2%A7%C2%85%0D%C3%A3%C2%B4)7%C3%ACj!%C3%AFtj%18%C2%A1%C3%843%C2%8CB-%C3%8B%C2%AFC%0D%C3%B6%C2%A6%C3%AF%C2%98q%C2%84l%C2%84%C3%BC%7B%23%08%C3%AB%C2%811%C3%9F-%C2%ACu%C2%9C%1B%C3%A9%1DJ8%26%C2%83%5Df%C3%A4%C2%87%C3%A5%05%C2%8FT%C3%87%C3%9F%C2%98O%09%07%7Fo%C3%ACkgr%2F%C2%A4%05a%3D8%C2%A6%C2%B8*%1D%7F%C3%A4xY%C2%BD%16%C3%B2%C3%A7%3A%C3%8E%04%1B%C3%89~%C2%98%1AJ%C3%B6%11%C3%A3%C3%B3%C2%90R%C3%88%C2%BBeZ%C3%86%C2%8B%C3%8F%1BAX%018%C3%9Ar%02%C3%A3v%C2%83%C3%860%C2%8D%C2%90%C2%BF%11(%C3%95q-%C2%B8o%04%C3%BB%5C%C3%BB%C3%A9%0D%C3%9B%C2%92q%C2%BBFt%C3%8E%C3%BF%C2%B0%11%22%C2%B6Y%C3%AE%C2%94%C3%B3%C2%B7%C2%8E%C2%AC%C3%BDzX%C3%A3%7B%C3%BB%C3%87%16%C2%B6%C2%9C%0C%C2%95%0Bj%C3%B4z%C2%9D%C2%A4%C3%B7%C3%88%02%C2%AAt%C2%BC%C3%B4%C3%99%C2%94%12%C2%B5%C2%BA4%C2%B5O%19%17%40%0A%C3%B6%C3%B9%C3%90%C2%B1g%C2%9F%C3%A5%0E%C3%9C%0Aa%C3%A4%C2%82%C3%B9%C2%A6%C3%89d%C2%92%C2%9E%22_%C2%99z%C2%8B%C3%BB%C3%88b%7F%60%C2%BE%C2%B8%C3%91%C2%B3%C3%8FM%C2%92%7B%20%26%C2%8C%5C%C2%9B%19%C2%B9%40%C2%8DX%C3%83%1B%12%0D%C2%A3%C3%80%1A%C3%A4U%C3%80%C3%9A%C3%A2%C2%A7G~%C3%B9%C3%B7%C2%9D%C3%B1%C3%9Bv%1B%C3%94H%C3%B6%C3%8E%03%C2%BFA%7DC%3A%C3%947x%C3%B9%7C%C2%80%C3%BE%C2%98XF.%C2%98o%C3%91%C3%A8%19%178J%C3%AC%C2%A3%C2%90D%26%C3%98W(%C3%81N%C3%BD'%17%14%3F%C2%B0%3E%05a%C3%A4Z%25%2C%C2%89%0B%C2%8E%C3%B7%40%15%C3%88%C3%9F%17q%C2%8A%C2%9Ecq%0Di%3DAX%5B%C2%A2%20%C2%88%C3%AB%C2%A6%C3%93%C3%82%C2%81%1E5b%0D%C2%9B%1A%C3%BFb%C3%BE%C2%B0%19%C3%9C~s%C2%AB2%C2%8E%3F%C2%A3%C2%A6%C2%82o%C3%9A%7F%C3%AB%C3%A0%23%10%C3%98%15%C2%A7%C3%84%05%C2%A3%C3%80%C2%86%2F%C2%AD%C3%B9%C3%80%7C%0BJ%7B%22%7FbI%C3%BF%C2%97qj%18%08%C3%BCz%C2%9C%C2%98%16%C2%9A%C3%84%C3%98%C2%BF%16%C2%AD%11%C2%82%C3%8D.%C2%BD%C2%BA%C3%A0%C2%81%5BQ%10%C2%A6%C2%85w%C2%B9%C3%A7%C2%B2%11s%C3%9E%C2%AFa%C2%B4%C2%8Co%C3%8B%07%C2%B6M%C3%8E%C3%BA%C3%A2%C2%AA%7Dwt%1F%C3%A1%C2%9A%C3%9FD%C2%9E%C2%92%C3%AA8%C3%A1%C3%B8%07%C3%87%5B%C3%82%C3%83%C3%95%3D%11%C2%A1f'%C2%9FV%C3%B2%C3%B7%13%C3%88%0F%C2%87C%C2%BB%C2%92%C2%BF%C3%9D%C3%B0%3F%0E%C3%8DJ%C2%8A%C2%9APB%C3%B4%00%00%00%00IEND%C2%AEB%60%C2%82";
        }
        else {
            var image1_imgString = "%C2%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00%C3%97%00%00%00%26%08%06%00%00%00W%C2%B3%0E%09%00%00%05%C2%B4IDATx%C2%9C%C3%AD%C2%9D%C3%A1q%C3%A36%10%C2%85%C3%A1L%C3%BE%C2%8B%C2%A9%C3%80J%05R%07V*%C2%90%3A8%C2%B9%C2%828%15%1CSA%C3%A4%0AN%C3%97%C2%81%5C%C3%81I%15%C2%9C%5CA%C3%A8%0ABU%C3%80%0C%C2%93%C2%B7%C3%89zg%01%C2%92%12%24%C2%93%C3%84~3%18%C3%9B2%04J%04%1Fv%C2%B1X%C2%82w%0ETU%C3%A5%220w%C3%8Eehf%1F%C2%A3A%C3%A3f%C2%AC%C2%9Ds%2B%C3%96%7F%3B%C3%A7%C3%9C%C3%969WZ%17t%C3%A3%C3%AE%C3%AE_Y%5D%22%C2%AE9%3Ac%C3%A1%C2%9C%7B%08%C3%94%3B8%C3%A7%C2%8E%10%C3%9B%C3%AE%C3%9A_%C3%8C8%C2%8BZD%C2%9F%C2%947%C2%BE%C2%A2%7FM%60%1D%C2%B8D%5C%C3%B5%08%C2%97%3B%C3%A7%C3%AE%C3%8F8%C3%AE%1B%3Arc%1DvS2%0C%C2%84S%C3%A5%C2%A0%C3%B5%20%C2%B9%0C%7C%C2%98%C2%83%C3%87%0B)%C3%8D%C2%B2%C3%A9%C2%9C%23%C2%AE%05N%26%17%C3%95%2B%C2%AC%C3%91%1E%C3%96I%C2%9E%C3%A89%C2%B3p%C2%BC%03O%10%C2%A9Y%C2%B2%C3%9BP%C2%B4%1C%0CO%C3%A8%C3%A3U%C2%87%C3%81%C3%B3g%C2%B4o%00%12%C3%97%7F%C3%94%C3%A2%0A%C2%94%C2%BCz%C3%8F%C2%B6%C2%AA%C2%AAi%C3%83%7Bd%C3%89%C3%90N%C3%89Z%C3%9A%C3%A1%C3%B5.%C3%ADX%C3%A9V%16U%7B%16%C3%95%C3%BF%7D%C3%95%C2%96'%C3%AB%C2%8F%C3%B7%C2%85%C3%B8%C2%A1%C3%85hS%C2%8Fd%C2%9F%C3%B1%C3%BB%01%23%C3%95%C3%BA%C2%8C%C3%91%C2%AA%C2%84%3BY%C2%BB%26_%C3%B1%C3%9A%12V%2Fkx%C2%AFq%1B%C2%B8%C3%A7qjyD%C3%AB%3B%0FM%C3%A2%C3%A2%13%C3%9Dg%C2%B8%C2%86%C2%97%C2%BA%00%25%C3%84%C3%B9%C2%88%0E%C2%9C%C2%99%C3%80zC%C3%AD%C2%A6%3F%C3%A1%C3%A7%24%C3%B5%C2%93q)%3F%06%C3%9E%C3%8F%C2%85%C3%B5%C2%88%C2%BFc%C2%B1%C2%80%C3%80%C2%A8%03I%60%C3%B3%C3%9E%C2%9E%C2%A94%C2%A8%C3%A7Y%7F%C2%A4~%12b%C3%A1%C2%B3%5Ck%26%C2%AC%C3%9F%22%0B%C3%8Bad%C2%94%C3%A1%C3%BB%19%C2%A2%C2%88%C2%861%0A4qM%C3%99E%C3%BE%22.%C3%B8L%C2%84s%C3%A5%C3%9F%1A%C3%92%1A%C2%AD%02.%C3%87%C2%AF%C2%B0j%C2%861x4q%C3%A5%C3%AC%C3%A2%C2%AF%03%0E%15%2B%7F!%C3%A4N%C2%82%C2%AA-%C3%90%C2%9F%C2%A2%C2%8E%2C%C3%9F!(.%C3%9E%10%C2%B1%C2%AD%C2%A4%C3%91%C2%9E%13%3C%C2%95%C2%BB%0E%25%C2%B7%C3%B3%C2%AB%23%C3%97%C2%B9%C2%A6%10%C2%8B%06-%00%17L%00%0BV%C2%B4%2C%C2%8Dg%C3%94%C3%A7%C3%96%2Ft%0C%22%C3%B6%1C%C3%AF%16%C3%A4%18D%C2%8E%C3%B8%C2%BE%C3%87%C2%9E%7C%C2%AE%C2%BAo%C2%BE%C2%B5%C2%AC%C3%BB%C2%8B%C2%A5%C2%AD%5D%C2%8Eo%C2%9Dk%C3%93%C2%B0%C2%B6%C3%A1%5B%C2%93%C2%9A%7B%C3%AA%C2%AF%3D%C3%B5%C2%B7%C2%9E%C3%BA%05~%C3%AE%07%C2%B6%C2%B61%15%C3%9F%C2%A3%C3%849%C3%A9%C3%83gk%C2%BB%C3%8E%C2%B5E%C3%BD%0C%C3%A7%C2%BF-9%C3%9E%C2%97%C2%A3%C3%BF%7C%7D%C2%9EL!%C2%A4%5BH%C3%AE%C3%9B%C3%AF%1E%C3%B9%C2%AE%3D%C2%AF%1Fa%C3%99%24%2BO%C3%BD%C3%9C%C2%B3%C2%8EB%16%C3%AE%C2%A1%C2%85%C3%BB%C3%98'%C3%A4g%C2%9D%0C0%C3%BAIK%2C%C3%AB%C2%86%5C%C3%91%10u%C2%B4%C3%B1K%C3%A0%3AI%0A.%C2%AE9Ky%C3%99%60%C3%81X%12%3Ai%C2%9A%1B%C2%B7%C3%B4%C2%AC_IW%C2%91%C3%980%C2%91%0E%3D%C2%B01D%C2%81%C2%B9H%C3%AB%C2%8D%C3%89%0B%C3%8C)%C3%A2r%C3%88%17%2C%3Db%C2%99%05%2C%C2%8Ao%C2%8E%C3%A4%C2%B3%5ER%5Cd%C3%89%C3%88%C3%A7%1F%C3%83%C2%9A%C3%97P%05%16%C2%83%C3%A4%05%C3%86%C3%85E%C2%A2%C2%A1%C2%89%C2%B8%2F%C2%A9%C3%96'%C2%96%02%C3%82l%5B%C2%BF%14%C3%96%C2%91DE%C3%87%C2%8F%7DAfh%3B%14%C3%99%3C%C2%B7%C2%84%02%06%26%C2%B0D%C3%91%C3%84E%C2%BEw%C3%89r%009%C2%B1%5CC'%22SR%5C%C2%B1%C2%99%C3%83%C3%B2~%04%24%C2%B0!%C3%8D%23c%C3%B1%250%C3%80%C2%8E%1AM%5C%1C%C3%8Dz%C2%85%5C%C3%83%C2%AE%C3%96.%C3%B4%C3%9Es'%C3%95%7De%C2%92p%06%C3%8AS%0F%3E%C3%83%C3%8D%09%C3%A5%16%3A%5C%C3%B0'%25%C2%A3b%C3%A5%C2%B9P%7CA%C2%88%C2%95%C3%87%C2%AA%C2%91H_%12%C2%B9'h%C3%8C%C3%89%C3%89%C3%9B%C3%80%1AY%C2%927Trq%C3%B9N%C3%80%16iI%C2%9C%C2%B5G%5C%3E%0BE%C2%AE%C2%A1%3C%06%C2%89Q%C2%B3x%C3%9A%C3%BCm%C3%A8%C2%8C1%C2%9Ba%C2%85%C3%AFU%C3%98M%C2%93%C3%AF%C3%A1n!%C3%8Du%C3%A4%C3%A8%C3%9A6j%C2%98AD%C2%AF%C2%9E5%2C)%C2%BC)%0B%C3%BD%C3%AF%C3%84%C3%AB%C3%AE%0A%C2%A3%5D%C3%91%C3%A1%1E%C2%A5k%C3%B08%C3%92%C3%AC%C2%87%19%C3%BAj%1F(I%C2%BA%C3%83%C2%9A%C3%A5%C2%92Q%C2%AD%23%04%23%C2%83%01%C3%925%24%C3%B1l%C3%90%C2%86%C2%B4v%C3%925%24%C2%AB%C3%B5%22%C2%84D%C3%87%C2%8F%3D%0A%16h%C3%BB%1AA%C2%85y%C3%83%C2%AD%1ACL%C3%A7%C3%AA%C3%82d%C2%84s%C3%A4%C2%8B%C3%A1%C3%A2%22%C3%8B%C2%A5%C2%9D%C2%A4%C2%ADr%C3%B1H%C3%97%C2%90%C3%84%C2%B5C%5BR%5C%C3%925%C3%A4%C3%B59%24%C2%BAkD%0D%3F%C3%82u%19%C2%BB%C2%B0%0C%0F%C3%9C-%C3%9C3%C2%B7I%C2%86%C3%9B%C2%9B%C2%A2%C2%86%C3%A4%12%C2%92%15jJ%C2%87%C3%8A%C3%98%C2%865%C3%92%25%24%0B9%06%17%C3%8A%C2%84%C2%9502%C2%B7%C2%90.t)%C2%AE%02%C3%82%C2%91P%3D%C3%8D%0A%C2%85%02%1Ed%C2%9D%C2%BE%0A%C2%97%C2%90%C3%9A%7B%C3%ABQVy%1B%C2%B4%C3%B9%C2%A1%09%2Bq%C2%A4%C2%B8%C3%A8bxP%C3%82%C3%AA%C2%9A%C3%B5%0A%C2%89K%C2%AB%C2%BFd%7B%C3%A8%C3%89%3A%19%5B%0F%19%C3%9A%04%C3%B8%C3%88%06%C2%9F7%13%C2%96%C3%A1%14q%C3%ADYJ%C2%92%0C%1B%C3%AF%C2%94h%C3%9B%3DD%C2%B8T%02%13%C2%85'%C3%B9w%C2%85r%12%C3%A2%C2%A2%C2%9B4O%03%C2%BD0%C3%AB%C2%81%C3%A6'%C2%B8%C2%B6%26%2C%C3%83%7B'%C2%B2%C2%83%C3%B5%C3%A2%2B%C3%AB%C2%A5%C3%87%1A%C3%91%C2%85%14%C3%BA%1Fg%03%11%C3%B1%C3%BA%0B%16%00%C3%89%07%C2%BA%C3%A8X%C3%9A%C3%AE%C2%B3%06G%13%C3%97%1Ew%10%3BD%08yh%5E%13%C3%8B%7D%C3%80%C3%9Ah%C2%82%C2%9B%C2%88%C3%BFe%C3%AC%C3%B7%C2%83mR%13%1D%5B%C3%98%C3%BD%20%7C%C2%BB%3F%3D%C2%B1%0C%09%C2%9E%C3%91%C2%BD%C3%B7D%01%7D9%C2%85%C2%BE%C3%A4_r%093%C2%B49a%5B%5C%1Bq)%C2%B0%2F%C3%86G.%C2%A0'IhS%C3%90%05%04F%19%C3%9D%C2%A1T%C2%A5%C3%90%C2%9E%C3%AF%C2%BE%C3%BAs%C2%B4%3BC%C3%87%C3%87%C3%98p%C3%94%C3%90%C3%99%60%20%0Bm%3Cc%1B%C3%8DD%26%24%C2%AER%08%C3%AC%1B%3A%40%C2%BB%C3%89%C2%B1I%5C%C3%9A%C2%A8)%C2%855%C2%A4%C3%90%C2%BBa4%C3%92%C2%B4%C2%9D5%09%C2%8C%C2%A2~%C2%9F%C3%85b%C2%B3k%C3%B9%C2%A4%129%1F%C3%BB%04%C3%81%C2%BE%C2%99%C2%B0%C2%8C%C2%B1%C3%92%C3%A6A%0C%240%C3%9A%C2%B4%C3%A6%5E%C3%9C%C2%82%C3%92%24%0C%C3%9F%1D%C2%B8%C3%8F%C3%B8%C2%9F%09%C3%8B%18%25%5D%1F~7%C2%85k%C2%A8%3D%C2%85P%5B%C3%93%C3%92%C3%B2%14%0Fh%C3%83%C3%B6%C3%87%C3%AB'9%7B%C2%AAM%2C%0E)%C3%AD%C2%A4L%C3%BB%166%C3%9D%2C))%C3%98%C2%93%25i1%C2%98%04%14%C3%8A%C2%8A~%C2%85%C2%98%C2%B6f%C2%A9z%C3%8F5%C2%82JI%C2%AE%C3%BF%C3%85z%C3%A08%C2%8DJ%C3%9A%03%C3%87%C2%B5'N%1A%C3%BD%25%C3%83%20%18z%C2%94k%17%C3%AA%C2%81%C2%B5%1E%C2%90%C2%93%19T%C3%BF%C2%B1%5C%C3%8E%C2%B9%C2%BF%01%C2%8F%C3%A7%C2%AAK%C2%B3%C3%8E%C3%B3A%00%00%00%00IEND%C2%AEB%60%C2%82";
        }
        var imagePlaceGun = placeGunInfoGroup.add("image", undefined, File.decode(image1_imgString), { name: "image1" });
        imagePlaceGun.helpTip = "Wähle einen Wordpress Beitrag.\nText und Bilder können mit der Platzierungs-Einfügemarke »Place Gun« in das aktive Dokument eingefügt werden.";

        var statictext3 = placeGunInfoGroup.add("group");
        statictext3.orientation = "column";
        statictext3.alignChildren = ["left", "center"];
        statictext3.spacing = 0;

        statictext3.add("statictext", undefined, "Wähle am besten nur einen WordPress Beitrag aus, das ist übersichtlicher. ", { name: "statictext3" });
        statictext3.add("statictext", undefined, "Text und Bilder werden in die Platzierungs-Einfügemarke »Place Gun« geladen.", { name: "statictext3" });
        statictext3.add("statictext", undefined, "Du kannst Sie dann flexibel in das aktive Dokument einfügen.", { name: "statictext3" });

        // GROUP7
        // ======
        var group7 = group3.add("group", undefined, { name: "group7" });
        group7.orientation = "row";
        group7.alignChildren = ["left", "top"];
        group7.spacing = 10;
        group7.margins = [0, 0, 0, 12];

        // GROUP8
        // ======
        var group8 = group7.add("group", undefined, { name: "group8" });
        group8.orientation = "row";
        group8.alignChildren = ["left", "center"];
        group8.spacing = 10;
        group8.margins = 1;

        var rbTemplate = group8.add("radiobutton", undefined, undefined, { name: "multiPost" });
        rbTemplate.preferredSize.width = 18;
        rbTemplate.value = newConfigObject.runMode == RunModes.TEMPLATE;


        // templateInfoGroup
        // ======
        var templateInfoGroup = group7.add("group", undefined, { name: "templateInfoGroup" });
        templateInfoGroup.preferredSize.width = 480;
        templateInfoGroup.orientation = "column";
        templateInfoGroup.alignChildren = ["left", "center"];
        templateInfoGroup.spacing = 10;
        templateInfoGroup.margins = 0;

        var stTemplate = templateInfoGroup.add("statictext", undefined, "Musterseite zur Platzierung verwenden");

        if (app.generalPreferences.hasOwnProperty("uiBrightnessPreference") && app.generalPreferences.uiBrightnessPreference > 0.5) {
            var image2_imgString = "%C2%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00%C3%97%00%00%00%26%08%06%00%00%00W%C2%B3%0E%09%00%00%00%09pHYs%00%00%0B%13%00%00%0B%13%01%00%C2%9A%C2%9C%18%00%00%05%C3%B1iTXtXML%3Acom.adobe.xmp%00%00%00%00%00%3C%3Fxpacket%20begin%3D%22%C3%AF%C2%BB%C2%BF%22%20id%3D%22W5M0MpCehiHzreSzNTczkc9d%22%3F%3E%20%3Cx%3Axmpmeta%20xmlns%3Ax%3D%22adobe%3Ans%3Ameta%2F%22%20x%3Axmptk%3D%22Adobe%20XMP%20Core%206.0-c005%2079.164590%2C%202020%2F12%2F09-11%3A57%3A44%20%20%20%20%20%20%20%20%22%3E%20%3Crdf%3ARDF%20xmlns%3Ardf%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2F02%2F22-rdf-syntax-ns%23%22%3E%20%3Crdf%3ADescription%20rdf%3Aabout%3D%22%22%20xmlns%3Axmp%3D%22http%3A%2F%2Fns.adobe.com%2Fxap%2F1.0%2F%22%20xmlns%3Adc%3D%22http%3A%2F%2Fpurl.org%2Fdc%2Felements%2F1.1%2F%22%20xmlns%3Aphotoshop%3D%22http%3A%2F%2Fns.adobe.com%2Fphotoshop%2F1.0%2F%22%20xmlns%3AxmpMM%3D%22http%3A%2F%2Fns.adobe.com%2Fxap%2F1.0%2Fmm%2F%22%20xmlns%3AstEvt%3D%22http%3A%2F%2Fns.adobe.com%2Fxap%2F1.0%2FsType%2FResourceEvent%23%22%20xmp%3ACreatorTool%3D%22Adobe%20Photoshop%2022.1%20(Windows)%22%20xmp%3ACreateDate%3D%222021-01-13T12%3A26%3A07%2B01%3A00%22%20xmp%3AModifyDate%3D%222021-01-17T07%3A53%3A59%2B01%3A00%22%20xmp%3AMetadataDate%3D%222021-01-17T07%3A53%3A59%2B01%3A00%22%20dc%3Aformat%3D%22image%2Fpng%22%20photoshop%3AColorMode%3D%223%22%20photoshop%3AICCProfile%3D%22sRGB%20IEC61966-2.1%22%20xmpMM%3AInstanceID%3D%22xmp.iid%3A1b9bd647-80af-a546-84be-9e5365da950e%22%20xmpMM%3ADocumentID%3D%22adobe%3Adocid%3Aphotoshop%3Adad1d226-20f3-ae44-8256-051ee7e96f9c%22%20xmpMM%3AOriginalDocumentID%3D%22xmp.did%3A8210cf81-dc36-3241-bf99-db0b6ac9abf5%22%3E%20%3CxmpMM%3AHistory%3E%20%3Crdf%3ASeq%3E%20%3Crdf%3Ali%20stEvt%3Aaction%3D%22created%22%20stEvt%3AinstanceID%3D%22xmp.iid%3A8210cf81-dc36-3241-bf99-db0b6ac9abf5%22%20stEvt%3Awhen%3D%222021-01-13T12%3A26%3A07%2B01%3A00%22%20stEvt%3AsoftwareAgent%3D%22Adobe%20Photoshop%2022.1%20(Windows)%22%2F%3E%20%3Crdf%3Ali%20stEvt%3Aaction%3D%22saved%22%20stEvt%3AinstanceID%3D%22xmp.iid%3A1b9bd647-80af-a546-84be-9e5365da950e%22%20stEvt%3Awhen%3D%222021-01-17T07%3A53%3A59%2B01%3A00%22%20stEvt%3AsoftwareAgent%3D%22Adobe%20Photoshop%2022.1%20(Windows)%22%20stEvt%3Achanged%3D%22%2F%22%2F%3E%20%3C%2Frdf%3ASeq%3E%20%3C%2FxmpMM%3AHistory%3E%20%3C%2Frdf%3ADescription%3E%20%3C%2Frdf%3ARDF%3E%20%3C%2Fx%3Axmpmeta%3E%20%3C%3Fxpacket%20end%3D%22r%22%3F%3E*3%C2%92%03%00%00%06%06IDATx%C2%9C%C3%AD%C2%9D%C3%AD%C2%95%C2%9B8%18F%C3%AF%C3%AC%C3%99%C3%BFa%2B%18%3A%18R%C3%81h%2B%08%1D%C2%84%C2%A9%20%C2%B3%15%2C%C2%A9%60%C2%9D%0A%C2%96T%C2%B0L%05%C3%B1V%C2%B0%C2%A4%03%C3%92%01%C2%A9%C3%80%C3%BBC%22%08Y%C2%92%C3%B9%1A%03%C2%B1%C3%AE9%1C%C3%99%C3%B2%C2%8B%1E%19%C3%AB%C2%B1%04%C2%92%C3%B1%C3%9D%C3%A9t%02%C3%A0%C3%AE%C3%AE%C2%8E%05%C2%88%C2%80%04%C2%A8%C3%95%16%C3%98%06%02xF~%3ES(%C3%94%C2%96%C2%A9%C2%B2r%C3%86%7D%C2%BE%19%C2%90%C3%8E%C3%90%7F%06*UN%02%1C%26%C3%A8g%13%C2%B5u%C3%BD%03%C3%90h%C2%A9%C2%95%C3%96S%C2%9CN%C2%A7%C3%AE%C3%898%12%C3%A4A%3E*%C2%A1%C2%93c%3B%C2%AA%C3%8A%C2%88)%22%C2%81%C3%99D%C3%B8%3F%C2%9F!%5B%C2%AE%C3%8A%C3%8A%C3%95%C3%B3%06%C3%B9%C3%B9%0F!%C2%9E%C2%A9%7D%C2%A2k%3BS%C3%B4%C3%85%C2%82%C3%BAG%C3%B5%C2%BC%C3%82%C3%B3E%C3%91z%C3%AA%C2%97%C2%81%15%C3%94%C3%89T%C3%A1%C3%BF%01%7F%02%C2%8F%C3%80%1BO%C3%BC%23%C3%B0%01%C3%B8%C2%82%C3%BC%C2%B6%C3%89%7D%15%0B%2CN%C2%82%C3%BF%C3%B3%C2%99%C3%82%1BdCK%06%C3%84%C3%86%0Bk%C2%8F%C3%95%17%C2%AF%C2%A0%C3%BF%C2%A0%C3%B4%23_%C3%90%18s%25HS%C3%BD%C2%AD%0A%07%C3%B8%0A%7C%04~%07~%03%C3%AE%C2%8C%C3%ADw%C3%A0%0F%C3%A0E%C3%85%C3%9F%23%0DY%23%C2%87%09%C2%81%C3%BD2%C2%A6%C2%81%C3%BF%C2%8C%C3%BA%17%0D6%C3%94%5C9%C2%B2%C2%A7jM%C3%B5%19x%C3%8B%C3%B9%C3%90%C3%90%C3%A4%C2%88%1C%12%C2%A6H%C3%B3%7D%04%C2%BE%23%0F%C3%8C%3F%C3%88q%C2%BC%C2%B3r%C2%81%C3%8D%C2%B3v%03_%5B%C3%9Fk%C2%B0!%C3%A6*%C2%90%C2%BD%0D%C3%88%C2%9E%C3%AA-%C3%9D%C3%90p%0C%0D%C3%92%C2%881%5DO%C3%B6%C3%9EW%C2%B9%C3%80.X%C2%BB%C2%81%C2%AF%C2%AD%C3%AF4%C3%98%25s%15H%03%00%7C%C2%A2%1B%1A%C3%8E%C2%A1A%C3%B6dO%C2%97*%17%C3%98%0Dk7%C3%B0%C2%B5%C3%B5%C2%ADm%C3%98g%C2%AE%C2%82%C3%8EXO%C3%88%C3%8B%C2%91K!%C3%A8%C2%9Fs%C2%B5%C2%95%0B%C3%AC%C2%97%C2%B5%1B%C3%B8%C3%9A%C3%BAg%06s%C2%99%2B%C2%A33%C3%96G%C2%A4%C3%91%C2%96%C2%A4%00%C3%9E%19y%0F%C3%88%C3%B3%C2%B3%C3%80~y%03%C2%94%2B%C3%AB%C3%A7%2B%C3%AA%C3%B7%C3%9A%C2%B0%C3%8D%5C%C2%91%16%C3%B0%C3%82ye%23%C3%A3q%C2%84%1F%C3%B3%C3%B5%14y%C3%95%C3%90%C3%86%07%C3%82%7C%C3%98%C3%9E%C2%B9g%C2%BD%C3%9E%03%C3%8E%C2%BF%C2%B4%C2%AFM%C3%BA%C3%A3%C2%91e%12%C2%B9%C3%80%3F%C2%A1%C3%96%C3%90%C3%8D%5D%C2%94%17b%C3%8DI8%C2%90%C3%83K_l%3D%C3%B7%C3%9D%05z%08%C3%A6O%C2%A2%1EV%C3%96%C3%8Ff%C3%A8%C3%A7%0B%C3%A8%C2%A7c%04%7Fx%C3%8A0W%C3%AC%11hTE3%C2%AD%C2%9CT%C3%A5U%C2%8E%7D%0A%C3%8E%7B%3E%C2%9F%C3%86%12%07s-%C2%9E%C2%91c%C3%AE%C2%82m%5D%C2%9C%11%C3%8Co%5C%0D%C3%93G%14K%C3%A8%C3%973%C3%B4%C3%B3%05%C3%B4%2BFL%C2%86%C2%BB%C3%8Cu%C2%B8%20%129%C3%8AK%1C%C3%B1%C2%99%23%C2%BEp%C3%84%C3%97*%3D%0E%7D%23%1B!%C2%A6%C2%BF%C3%84%C2%A8b%3B%06%13%C3%8Co%5Cc7%C2%B1%C2%B2%C2%BEN~m%7D%C3%97%C3%B2%C2%A7T%C2%A5%C2%9F%C2%B0%C2%93%3A%C3%B2%2B%C3%A0%C3%9B%C2%88%C3%B8%C3%9C%C2%91%7FP%C3%A9%23%C2%AF%C2%B3l%C3%A6%C2%B5%C2%88%C3%A9%2F1z%20L%2F%C3%9C%3C%C2%BA%C2%B9%12%C2%BA%0B%0D%07%C3%A4%C2%84%C2%B1I%C3%A6)%C2%AB%C2%B0%C3%A4%C2%BD%C3%83%C3%9E%C3%80j%C3%A4UH%C2%93%03%C2%9DI%C2%85Gk%0F%04%C2%83%C3%9D8%C2%A6%C2%B9%40%C2%9A%C2%AA%C3%86~%12%C3%AB%C3%ABQ%0AG~%C3%AA%C3%887%C3%8B%C3%BF%C2%AE%C3%92%C2%A3Q%C2%9F%3D%13%0Cv%C3%83%C3%A8%C3%A6%C2%8AUZ%C2%A9%C2%B4t%C3%AC%C2%93%3A%C3%B2k%C3%AC%C2%BD%C2%9D%2B%C2%BE%01%C3%BE%C3%95%C2%9E%1F%0D%C3%BD%C3%84%C2%B1%C3%9FT%22%C3%9C%17%5E%C3%A6n_%3C%C2%BA%C3%81%607%C2%8A%C3%8D%5C%C2%B5J%1B%C3%A4%02%5D%C2%93%C3%8CS%5Ea%C3%89s%0D%0D%C2%A1%7F%C3%A1%C2%A2%7D%5Cy%C3%8A%C2%9FCB%C2%B7%C3%B0%C3%B8%C3%9A%04%C2%83%C3%9D%206s%C3%A9%C2%94%C2%96%C2%BC%07G%C2%AC%2B%1E%C2%86%C3%8D%13%C2%98%C3%BB%3E%0E%C3%98gO%3C%10V%C2%A0%C3%9C%14%C2%97%16%C3%AE%C2%96t%C3%A7B%3A%C2%A9%23%5E8%C3%B2%5D%C3%B1%C2%B1J_%C2%B8%C2%8D%C3%89%C3%A3x%C3%AD%0A%04%C2%AE%C2%87n%C2%AE%C3%86%11SX%C3%B22Gl%C3%AA%C3%88w%0D%0D%13%C2%95%C2%96%C2%96%C3%97l%C3%A7o%7B'_%C2%BB%02%C2%81%C3%AB%C2%A1%C2%9B%C2%ABRid%C3%84%14%C2%96%C3%BDlC%C3%83%08i%C2%A2%C2%AF%0C%C3%AB%C3%ADb%C2%BAs%C2%A0%C3%92%C3%88%07%C3%8F%0D%40%26Rc%C2%AF%C3%97%C2%B5xb%7F%C2%93%C3%A3%C2%81%19%C3%BC%C2%AA%3DnT%C2%9A%181%15r%C3%AE%C3%A9%C3%9E%C3%88O%C3%A9%C2%9FC%C2%A4*-T%19%C3%AF-%C3%B1%C2%85%C3%B6%5C%C2%A8%C3%B4%C2%85%C2%BE%C2%91b%C2%95%C3%96%2CK%C2%8D%C2%ACW%C3%AC%C2%8D%C2%9AF%02%C3%BC%C3%A5y%C3%BD%C2%89%C3%A5%7FY%10%C3%98%3A%C3%9A%C3%B2'%C2%81%7D%C3%B9%08%C3%98%17%C3%9BVFLI%C2%B7D*%C2%B1%C3%84%C2%B7%C2%AF%C2%99%C3%B1%C2%99QN%C2%A5%C3%B2%C2%9FG%C2%BD%C2%91u%11%C2%B8%2F%C3%93g%C2%AB%C3%95J%22%08%C3%8B%C2%9F%C2%AE%C2%AA%C3%AFZ%5B%C3%98%C2%A8%C2%80%C3%94%C2%A8%60%C3%AC((V%C2%AFG%C3%AAy%C2%A9%C3%ADS%5B%C3%A23%23%C3%9E4%C2%9C%C2%AE%C2%93%C2%B0%1F%04%C3%9B4%16%04s%C3%A5%C3%97%C3%96w%C2%AD-%2CU%C3%BAl%C3%A4%C3%97t%C3%B7%C2%BD%C3%90I%C2%8D%C2%B4%C3%94%5E%2B%3C%C3%B1B%C2%A5%C2%9F%C3%A9%0F%093%C2%95~%C3%A3%C3%B5%C3%A6%C2%BB%5E%C2%83%C3%86%C2%92%17%C2%86%C2%82%C2%B7%C2%8E%C3%91s%09%C3%AC%C3%9F%3E%20%1B%C2%BE%C3%A9%C3%92Z%C2%BDV%C3%A2%C3%AF%C2%85%C3%B4-%C2%A2%5B%15%C2%9Fj%C3%B1%11%5D%C3%8F%C2%99Oz3%C3%ABR%22%C3%AB%C3%9E%C2%B0%C2%8D%1E%C2%ABE%10z%C2%AEUz.%C3%9B%C2%8F%25%C2%8F*%C3%A8hT2%C3%82~%C3%A7%C3%96%C3%B6%C3%A0%C2%95%C2%9CSY%C3%A23UN%C3%A38%08%0D%C3%BB%5C%C3%89%10%C2%B1%C3%8Dy%2CA0%C3%97f%C3%8C%C2%A5%1F%C2%8Cg%C2%A3%C2%A2%C2%85%C2%A5%C2%B0%C2%9A%C3%8E4%26%C2%99%25%C2%BEQi%C2%A1%C3%85%25%1E%C3%8D%C3%80%3C%04%C3%81%5C%C2%9B1%17%C3%B4%7F4%C2%99h%C3%B9%C2%A9%C2%A3%C3%80%06%7Bo%13y*%C2%91j1%C2%B5%C3%8A%C2%AB%2Ce%04%C3%A6!%08%C3%A6%C3%9A%C2%94%C2%B9%22%C2%BA!%5DC%C3%9F%60%C2%B5%C2%A5%C3%80%C3%82%2C%40%C2%A3%C2%B4%C3%847%0E%C2%9D%C3%98SN%60%1A%C2%82%60%C2%AEU%C3%8C%C3%A5Z%5B%C3%98%C2%A8%C2%83%C3%B2%C2%95%C3%AE~p%C3%AD%01%2B-%C3%B1%C2%B6%C2%BC%C2%96%C3%82%11%1F%C2%ABr%1F%C2%90%2B'%04%C2%B7%C2%B1%C2%BE0p%23%C3%B8%16%C3%AE6%C3%88%C2%A1%5Bk%C2%B0%2F%C3%88o%C2%81%C3%82%C2%88%C3%BB%C2%8E%C3%9F%5C%25%C3%A7%C3%8B%C2%8E%1Ad%C2%8F%C2%A5%1B%C2%AB%C2%BAP%C3%97%40%60W%5CZ%15_%C3%93%C3%B5%60%20%C3%AF%19_%C3%927K9%40%C3%87%C2%8C%C3%B9%C2%804%C3%AC7%C2%82%C2%B1%02%3F)C%C3%BE%C2%88%C2%A1A%C2%9Es%C2%B5%C3%B7%C2%BC%C2%B8%C2%A7%7F3%C2%96%C3%AA%C3%82%C3%BE1%C3%B6I%C3%96%17%C2%96%C2%B9%C3%B7%7C%20%C2%B0MF%C3%BE%C2%B3d%C2%8C%C3%BB%C2%B6hG%C3%8B%C3%968%C3%A2%C3%84%C3%9Cz%07%06%23%08%174V%C2%B9%C2%A01%C3%B5o%5Bc%C2%BA%C3%BF%C2%89%1D%22X%23%2F%C3%AF'c%C2%85%02%C2%B3%C2%89%C2%B9~%C3%A3%C2%8E4%C3%BD%C3%A4%C3%8A%C3%9A%C2%B5%C3%B1%C3%BE%C2%B3%2B%C3%ABWs%C3%8De%22%C3%A8%C3%AE%C2%BE%C3%9Bn%C2%99%C3%8A%C2%8F%C3%A6%16%1E%C2%98%C3%8D%C2%81%C3%B9%C3%BF%C2%8B%3Cdk%C2%B0%2F%02(%C2%AE%C2%A0%C3%9D%1A%2B3%C2%B4%23%C2%86%C3%9Fv%7D%09%7D%C3%91z%C3%AA%7F%C2%BD%C2%9A%C3%8ET%C2%93%C3%94%C2%845%00%00%00%00IEND%C2%AEB%60%C2%82";
        }
        else {
            var image2_imgString = "%C2%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00%C3%97%00%00%00%26%08%06%00%00%00W%C2%B3%0E%09%00%00%05%C3%8EIDATx%C2%9C%C3%AD%C2%9D%C3%AD%C2%91%C3%A2H%0C%C2%86%C3%85%C3%95%C3%BD%C3%87%17%01%5C%04%C3%83F%00%1B%C3%81%C2%90%C3%812%11%C3%8C%5C%04%C3%A7%C2%8D%60%C3%98%08%C2%96%C2%89%C3%A0%20%C2%82a%228%26%03O%04k%22%C3%B0U%C3%97I%5BZ%C2%95%C3%A4%0F%C3%BC%C2%85%C2%B1%C2%9E*%17%14%C2%B4%C2%BBm%C3%9C%C2%AF%C2%A5V%C2%8B%C3%B6%04%C2%90%2C%C3%8B%C2%A0%01%22%00X%00%40%C2%82%C2%9Bs%1D%C2%AC%00%C3%A0%09%C2%AF%C3%8F%25%C3%ACp%C3%9B%60%5Dq%C3%85%C3%AB%1B%C3%B6%5B%C3%97h%3F%1C%C3%BB%09%C3%AB%09%C3%BDk%7BA%C3%BB%C2%9B%0B%C3%9B%C3%A6%C3%AD%C2%87vS%C3%B6%C2%AA2%C2%99%C3%BC%2F%C2%AB%C3%9Fk4%C2%B8%C3%80%1Fl%C2%85%C3%AF%C2%A7F%C2%B97%3C%C2%B0%3D%00%1Ck%C2%B4%C3%A7%5CF%C2%84%C2%BF%C2%BDu%7D%C3%8A%40%C3%97m%0E%00_%C3%98u%3F%C2%95%C3%987%C3%AC%C3%B3%C2%BD%C3%A6%C2%B5%23Q%C2%86%C2%BA%1E%C2%99%C3%88%C3%8B%C2%B4%C2%BFj%C2%B0%C3%BD%C3%90%C3%8F%C2%97%C3%AC%C3%BCM%C2%81%05~%C2%BB%C2%A0%C2%A1%0D%C2%9E%C3%94%C2%BF%00%C3%B076%C2%96w%C3%A1%C2%96%C3%B8%C2%83%C2%BC%C3%A2%C3%9D%26%C2%AEq%07s%C2%AA%C2%93w%C3%A3%C2%BB%C2%94)%0AnQb%C3%BFy%0B%C3%97%C2%ACJ%C3%BB%C2%AB%16%C3%9A%C2%BF%C3%83%C3%B6s%C3%BBq%15q-PT%C3%9F%C2%B1%C3%B2%C3%80%3B%00%7C%05%C2%80%C3%8F%00%C3%B0G%C2%B0%C2%88b%0B%C2%9F%C3%BF%05%00%07%2C%3FCA%26%C2%A8~g%C2%B8T%C3%A9%C3%A0m%C3%90w%C3%BB%C2%85%02%2B%2B%C2%AE%18-%15%C2%89%C3%AA%05%00%3E%C3%A1%C2%89%C3%85%C3%98%C2%88f%22%C2%8F%C3%A8%C2%9F%C2%AEQ%7CA%C2%88g%C3%BCa%C3%BEA%3F%C3%9E%C2%AD%C3%98pq%C2%81%C3%A5%08%C2%AC%C2%8C%C2%B8vhm%00-%C3%95'%C3%A6%1AV!E!%C3%8E%C2%99%25%C3%BBR%C3%86%C2%BC%3AW%C2%8D%0B%C3%8C%C3%A8%C3%83E%C3%A2%C3%9A%C2%A1%00%02%C3%9F%C2%98kX%C2%87%14-%C3%99C%C3%91%C3%819%C2%83%C3%81%05%C2%A6%C3%B4%C3%A1%3Cqqa%3D%608%C2%B2)Vb%C3%8Cu%C3%A7%C2%91%C3%84%C3%81%C3%A3%02%13%02%C2%B3%C3%84%C2%B5a%C3%82%C3%BA%C2%8ABk%C2%92P%C3%9F%C2%BDrp%C3%9BVN%C3%9B%C3%A9%C2%8A)%C2%86%C3%BD%C3%BBb%C2%8AC%C2%8F%C2%BE%C3%B8%C2%A5%0Fk%C3%A2%C2%8AX%C2%81%C2%83r%C2%B0%C2%91x_%C3%A4%C3%8E%C3%89%C3%AF%C3%97%185%C3%94xl)t%C3%AAt%C3%87%C2%ACG%C3%AB%01%C3%8AM%C2%BBk~zd%C2%9A%C2%B8%C2%B6l%5E%24%1Ch%26%C2%B6%C2%84%C3%8D%5D%04%0B%C3%B4C)%C3%83%C2%B7%1FB0E%C3%B3%1EM%5BI%C2%A7%3Et%C2%83%C2%8C%C2%95%C3%A9%16m%C2%AB%3B.%C2%97P%C2%9F)%C3%9B~%C3%93%C3%90%C3%B9%C2%AFJ%C2%B4m%C2%BA%C2%85s%C3%A6%0EJ%C3%8E%C3%A8%22%3E%C2%B1%C3%94%C2%93%1D~%C3%B6n%C3%AC%C3%B3%C2%82%C3%9F%C3%B3%C3%B1T%C2%91%C3%9B0%C2%AB%C2%99%C2%AA%C3%92%17Ox%C2%9E%C2%B78%C2%BD%C2%B0%C3%A9%C3%99%C2%A3%C2%88%C2%AF%C2%A0%C3%BD%C3%8B'%C3%83Cna%C2%96e%C3%9B%2C%C2%9F%08%C3%8B%C3%89ma%C3%AC%C2%B51%C3%8A%C3%AF%C2%8C%C3%B2%09%C2%BE%1E%C2%8D%C3%BD%C2%AEu%C2%9BgY%C2%96%C2%B2%C3%B38%C3%A5%C3%BCV%5Do%C2%AB%C2%82k%C3%9A%06%C2%A1M%3A%C3%8F%3E%C3%9A%C3%A7%C2%BFq%C3%9Cy%C3%A3%C2%88%C2%B4%5C%C3%A4%2F~34heU%047%C3%A0%C2%A3Byk%C3%90Ic%C2%BDeKi3m1%17)F%3E%C2%BD%C3%A0%C3%BC%22%C2%AE%05%0B4l%0DW%2F%C3%8F%5D%C3%93%C3%86J%C3%B7F%07K%C3%90%5D%C2%94l%C2%99H%C2%87%1E%C3%98p%C2%81%C2%8D%1C).%40Q%25FX%3C%C3%8F%C2%A2X%C2%81%08%C3%8Bz%C3%89%C3%BA%C3%8F%C3%B8J%C3%A3%C2%B3%3E%23NM%C3%A1%02%1B1%5C%5C%24%1A%C2%8A%C3%B4X%C2%81%07K%2C%C2%89a%C3%AD%C2%AC%C3%B2)%C3%BE%1D%C2%85%20QQ%C3%BBM%C2%8B%2B%C3%82%C2%BA%C3%B3%22%C2%9B%C2%97n%C2%AF9%C3%AD%C2%BA%C3%80F%C2%8A%26.%C2%8A%04%C2%A6%18%C3%AD%C2%934%C3%A5%1A%C2%82%C2%88%22Jq5%C3%8D%C2%82%25%1Ew%C2%8D%0Bl%C2%84h%C3%A2%C3%A2h%C3%96%C3%AB.%C3%875%C2%ACj%C3%AD%C3%B2%C3%B6%5D%C3%9E%C3%98%C3%A5%C3%B0%0C%C2%94%C2%91Q%C2%94%C2%B8%C2%BBgc!%C2%8E%25%16%2B%08a%C2%95'%C2%91%1EF%C2%B2%2C%C3%80%C2%90%22%C2%A0NM%C2%B8%C2%B8%C2%AC%C2%BF%2Ck%C2%AE%C2%9E%C3%A5%1AZ%22%C2%B2%5CC%1AWi%16%C3%8F%C2%9A%C2%98%1E2%7D%C3%A6%C2%BD9%1D%C3%83%C3%85Ec%1D)%02M%5C%C2%9Ak%18%C2%A1%C2%88%C3%9EKZ%C2%BB9%1B%03%C3%AD%C3%85%C3%A7P%C2%B4%3E%C3%81%05%24%C3%86qu%C3%85%C2%83g%C3%BE%C2%8F%0B%C2%BE%40%0Duf%19%C2%A5%C2%A3%09b%C2%99l%C2%BB%16c%08%12%C3%8F%0E%C3%AB%C2%90iTk!Tr!%0FBH2%C2%B0%C3%92%14%09%1EW%1B%C2%AEY%C2%A8%C3%B79%C3%A7%C3%BB%07%C3%8F%C2%99%1C%1F%5C%5Cd%C2%B9%C2%B4%40%C3%82V%C3%A9%3C%C2%9B%1Cqi9%C2%8A%C3%A4%1A%C2%A6%C2%A2%C2%BCt%09%C3%A9%C3%B36%C2%A2%C2%86%7D%2C%C3%B9%C3%A6%C3%82%1A)%C3%9C-%3C2%C2%B7I%C2%BApEQCr%09%C3%89%0A%15%C2%A5CE%C3%AC%C2%AF%01%C3%92%25%24W%C3%B1%16%5C(%17%C3%96%C2%88%C2%91%C3%91B%C3%AA%C3%A8%C3%B2_%C3%87%09%5B%C3%B7%C2%82Cb%C3%91%C2%AC%C2%90%C3%96%C2%A9%C2%A8%1C%C2%B9%C2%84%2F%C3%82%25%C2%A4%40%C3%89G%C2%8B%C3%B3%5Dm%C2%A0%C2%8D%0F%5DX%23G%C2%8A%C2%8B%3A%C3%83R%09%C2%ABk%C3%96%C2%8BDXV%5C%C3%A4%1Aj%C3%A5%23V%C3%9F%C3%90%3A%C3%A5%C2%89%C3%9D%7C%C3%8E.%2C%07%14q%1DYJ%C2%92%0C%1Bks%5E3%14%C3%A1%C2%BD%12%C2%98%C3%88K%C2%87Zc%5D%5C%5CO%C2%98Y~%1E%C3%A8dk%C2%B0%C2%BA%7F%C3%A2M%C3%82%C2%85%C3%A5%C2%A8%C2%93%C3%88%24%C2%AA%C2%A5p%0FS%C3%83zQG%C3%92%C2%BE%C3%93D%C2%B2U%C3%96ZX%C2%B0%C3%A5%C3%9B%C3%A2%16%C3%82%C3%B0%5D%C2%90%C3%BA%C3%BA%C3%B8%0EG%13%C3%97%C2%91%C3%BD%C2%9F%C3%ABY%C2%84%C3%A65%01%C3%8D%14%2B%C2%94W~*%C2%BE%C2%8B%C3%98%C3%BBwO%11rn%05%2B%C3%BD)f.%C3%9DQdRhQ%C3%80%C2%BDamR%23%10Bb%C2%8C%C2%B0~%12%C2%A8%2Fq%C3%AD%C3%9C%0C%C2%96%C2%B8R%1CK%C2%BD%C2%B3%C3%B5%C3%A0(%C3%80Q%C3%96B%11%C3%9A%C3%B8c%C2%8Fa%C3%B7%23%C2%86%C3%9E%C3%8FX%C2%BF%C2%BBU%C3%8E%C3%8D%C2%90%C2%97%C2%B8K%2B%C3%A3%C2%92%C3%80%5E%C3%91%C2%A2I%C2%B1X.!%C2%A1%05Bh.%C2%8C%0BkH%C2%A1w%C3%87)%C2%A4(%2B%3Ea%16%0C0%C3%A8%20%C3%85Rf%11HY%C3%A6%11%05%C3%BB%C3%A1%C3%82rn%C2%952%0FbHq%C3%8CEk%5E%C3%8C%C3%84b%2CE%C3%82%C2%98%1B%C3%A3%C2%B1CCk%C3%8F%3B%C3%8EUR%C3%A5%C3%89%C2%92%C3%A4%12%C3%86%22o%C3%B0%19%C2%B77e%1F%C3%AD%C3%81ko%C3%AC%C2%B1C%C2%8Es%C2%B3T%7Dlk%C2%82%C2%93%C2%A51%C2%8E%C3%876%2C%170%C3%AF%C2%9F%C3%83%1F%C3%A8%1A%C3%AE%C3%9CRuN%1FA%22~%C2%8D%C2%BB%C2%9E%C2%B3%C2%94%C3%91%C3%AC%C2%AE%C3%8F%C3%BFg%C3%A2DS%0F%1C_%C2%B1%C2%87%C2%8D%13%C2%94%C2%81~%1A%C3%A8%C2%A4%C3%B0-%C2%B1%C3%85%1Ba%C3%93%C2%8Fo%C2%95%C2%9C%C3%B1%C3%86%2B%C3%A7*%C3%B9%13s%C3%9A%24%08K%06%C3%9D(c%C2%A6%C2%8B5%C3%A4C%C3%BB%C2%9B%C3%89dr%04%00%C3%B8%0F%C3%96EWL.*%C2%9B%C3%83%00%00%00%00IEND%C2%AEB%60%C2%82";
        }
        var imageTemplate = templateInfoGroup.add("image", undefined, File.decode(image2_imgString), { name: "image2" });

        var statictext5 = templateInfoGroup.add("group");
        statictext5.orientation = "column";
        statictext5.alignChildren = ["left", "center"];
        statictext5.spacing = 0;

        statictext5.add("statictext", undefined, "Wähle einen oder mehrere WordPress Beiträge aus.", { name: "statictext5" });
        statictext5.add("statictext", undefined, "Die Beiträge werden automatisch platziert. Der Import benötigt eine", { name: "statictext5" });
        statictext5.add("statictext", undefined, "konfigurierte Musterseite mit dem Namen " + configObject.masterSpreadStart + ".  ", { name: "statictext5" });

        // GROUP10
        // =======
        var group10 = group3.add("group", undefined, { name: "group10" });
        group10.orientation = "row";
        group10.alignChildren = ["left", "top"];
        group10.spacing = 10;
        group10.margins = 0;

        // GROUP11
        // =======
        var group11 = group10.add("group", undefined, { name: "group11" });
        group11.orientation = "row";
        group11.alignChildren = ["left", "center"];
        group11.spacing = 10;
        group11.margins = 1;

        var rbDatabasePublishing = group11.add("radiobutton", undefined, undefined, { name: "databasePublishing" });
        rbDatabasePublishing.preferredSize.width = 18;
        rbDatabasePublishing.value = newConfigObject.runMode == RunModes.DATABASE;


        // acfInfoGroup
        // =======
        var acfInfoGroup = group10.add("group", undefined, { name: "acfInfoGroup" });
        acfInfoGroup.preferredSize.width = 480;
        acfInfoGroup.orientation = "column";
        acfInfoGroup.alignChildren = ["left", "center"];
        acfInfoGroup.spacing = 10;
        acfInfoGroup.margins = 0;

        acfInfoGroup.add("statictext", undefined, localize(ui.panelACFFileds));

        if (app.generalPreferences.hasOwnProperty("uiBrightnessPreference") && app.generalPreferences.uiBrightnessPreference > 0.5) {
            var image3_imgString = "%C2%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00%C3%97%00%00%00%26%08%06%00%00%00W%C2%B3%0E%09%00%00%00%09pHYs%00%00%0B%13%00%00%0B%13%01%00%C2%9A%C2%9C%18%00%00%05%C3%B1iTXtXML%3Acom.adobe.xmp%00%00%00%00%00%3C%3Fxpacket%20begin%3D%22%C3%AF%C2%BB%C2%BF%22%20id%3D%22W5M0MpCehiHzreSzNTczkc9d%22%3F%3E%20%3Cx%3Axmpmeta%20xmlns%3Ax%3D%22adobe%3Ans%3Ameta%2F%22%20x%3Axmptk%3D%22Adobe%20XMP%20Core%206.0-c005%2079.164590%2C%202020%2F12%2F09-11%3A57%3A44%20%20%20%20%20%20%20%20%22%3E%20%3Crdf%3ARDF%20xmlns%3Ardf%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2F02%2F22-rdf-syntax-ns%23%22%3E%20%3Crdf%3ADescription%20rdf%3Aabout%3D%22%22%20xmlns%3Axmp%3D%22http%3A%2F%2Fns.adobe.com%2Fxap%2F1.0%2F%22%20xmlns%3Adc%3D%22http%3A%2F%2Fpurl.org%2Fdc%2Felements%2F1.1%2F%22%20xmlns%3Aphotoshop%3D%22http%3A%2F%2Fns.adobe.com%2Fphotoshop%2F1.0%2F%22%20xmlns%3AxmpMM%3D%22http%3A%2F%2Fns.adobe.com%2Fxap%2F1.0%2Fmm%2F%22%20xmlns%3AstEvt%3D%22http%3A%2F%2Fns.adobe.com%2Fxap%2F1.0%2FsType%2FResourceEvent%23%22%20xmp%3ACreatorTool%3D%22Adobe%20Photoshop%2022.1%20(Windows)%22%20xmp%3ACreateDate%3D%222021-01-13T12%3A26%3A23%2B01%3A00%22%20xmp%3AModifyDate%3D%222021-01-17T07%3A54%3A13%2B01%3A00%22%20xmp%3AMetadataDate%3D%222021-01-17T07%3A54%3A13%2B01%3A00%22%20dc%3Aformat%3D%22image%2Fpng%22%20photoshop%3AColorMode%3D%223%22%20photoshop%3AICCProfile%3D%22sRGB%20IEC61966-2.1%22%20xmpMM%3AInstanceID%3D%22xmp.iid%3A7a0990c0-acc5-4c4b-8503-88868d39c8f8%22%20xmpMM%3ADocumentID%3D%22adobe%3Adocid%3Aphotoshop%3A0d805bbf-7b82-2f4b-93d8-b96e0743f626%22%20xmpMM%3AOriginalDocumentID%3D%22xmp.did%3A914643d6-fd23-2e48-b63c-c57c121bd21d%22%3E%20%3CxmpMM%3AHistory%3E%20%3Crdf%3ASeq%3E%20%3Crdf%3Ali%20stEvt%3Aaction%3D%22created%22%20stEvt%3AinstanceID%3D%22xmp.iid%3A914643d6-fd23-2e48-b63c-c57c121bd21d%22%20stEvt%3Awhen%3D%222021-01-13T12%3A26%3A23%2B01%3A00%22%20stEvt%3AsoftwareAgent%3D%22Adobe%20Photoshop%2022.1%20(Windows)%22%2F%3E%20%3Crdf%3Ali%20stEvt%3Aaction%3D%22saved%22%20stEvt%3AinstanceID%3D%22xmp.iid%3A7a0990c0-acc5-4c4b-8503-88868d39c8f8%22%20stEvt%3Awhen%3D%222021-01-17T07%3A54%3A13%2B01%3A00%22%20stEvt%3AsoftwareAgent%3D%22Adobe%20Photoshop%2022.1%20(Windows)%22%20stEvt%3Achanged%3D%22%2F%22%2F%3E%20%3C%2Frdf%3ASeq%3E%20%3C%2FxmpMM%3AHistory%3E%20%3C%2Frdf%3ADescription%3E%20%3C%2Frdf%3ARDF%3E%20%3C%2Fx%3Axmpmeta%3E%20%3C%3Fxpacket%20end%3D%22r%22%3F%3E%C3%B6%0F%C3%9F%C2%AB%00%00%06%25IDATx%C2%9C%C3%AD%C2%9D%C3%A1%C2%91%C2%A36%14%C2%80%C2%BF%C3%8D%C3%A4%C3%BFr%15%2C%C2%A9%C3%80t%C2%B0%C2%BA%0A%C2%8E%0E%C2%8E%C2%AD%20%C2%9B%0A%C3%A2Tp%5C%05!%1D%C2%B0%15%C3%84WA%C3%98%0A%C3%82V%10%C2%B6%02%C3%B2Cb%10B%C3%82%60c%C3%80k%7D3%1A%19%C3%B1x%C2%92%C2%85%C2%9E%C2%9E%C2%90d%7CW%C3%975%00wwwx%3E%2C%02x%06%C2%82%13%C2%AF%C3%8FTH%C2%80%08H%C2%81r%C3%A8%C2%82%C2%A6%5D%C3%9D2%3F%C2%9Fqm%08%C3%84*%C2%84%C3%80%C2%83E%C3%A6%1D(%C2%80%03%C2%90%C2%AB%C3%8F%C2%9Ee%09%C2%90u%7F%7F%C2%86%C2%8E%C2%83%C2%8AC%C3%A0W%C2%A4%C2%91%09%C3%BC%C3%BD%1C%C2%A6%C2%AE%C3%AB%C2%A9%C2%BDL%C2%82%C2%AC%C3%94%C3%BA%C2%84Pr%5E%0F%C3%AA%C2%99%C2%8E%C3%A0%C2%B4%7B%C2%A5%C2%87%C2%BD%C3%92%C2%B5%C3%97%C3%92*%C2%A4%17%C2%B3%C3%92%C2%B4%C2%AB%5B%0E%3FM%C2%B8I%11%C2%B2%07%C3%BB%13%C3%98%C2%A9%C2%B47%C3%A0%3B%C3%B0%19%C3%B8%05%C2%B8%C3%93%C3%82'%C2%95%C3%BE%1B%C3%B0%C2%A2%C3%A4%1F%C2%80oH%C3%A3%C2%8C'%C3%A4%C3%AD%C3%99%1E%C3%B7%C3%88%C3%B6%10%C2%AD%5B%C2%8C%0D3%C3%92s%3D%C3%93%C3%AD%C3%892%C2%A6Wj%C2%88%C3%AC%C3%B9*CO0Q%C2%8Fg%1A%C2%82%C3%8Bx%C2%AEA%0F%C2%B6%C2%B6%C3%97%C3%98B%18c%5C%C2%99V%C2%91%C2%85%C2%AD%22'%12%20%C2%9F%01t%C2%9D%C3%81%C2%99%3A%3Dn%04%C2%975.%C2%AB%C2%81%C2%AD%C3%9D%C2%B0%C2%B7%10%C2%8E%0D%0B3%C3%A0%C2%AB%C3%BA%C3%BC%C2%97%C2%AA%C3%80b%C3%9A%C2%BD%C3%ADQ!%C2%87%C2%84O%C3%AAx%C2%87%1C%5E%04g%C3%AA%C3%B5%C2%AC%C2%87%1F%22Z%182%C2%AE%C2%94%C3%96%C2%B0%C2%9E%C2%90%13%19s!Thh%0C%C3%8Cs%C2%BDx%033p%19W%C2%8C%C2%9Cr%05%C3%B8%03%C3%A9%C3%81%C3%A6%24%C2%A35%C3%9C%C2%86%1D%C3%92%C2%A0%3D%C3%97%C3%8B%3D%C3%B3%C2%B7%C2%95%C2%AB%C3%85f%5C%01m%05%C2%BD%C3%90%C2%8E%C2%B7%C3%A7%22%C3%86%C2%BE%26%06%C3%92%C2%A0%C3%85%C3%8C%C3%B9y%C2%96e%C2%87%C3%B7%5E%C2%80%C3%9D%C2%B8R%C3%9A%05%C3%87%2F%C3%98%1F%5E%03u%3E%C2%B7%C2%9C%C2%B7%05%C2%A1%C3%A9%0F%C2%8F%C2%94)%1D%5Dz%C3%8FR%04*%C3%9E%C3%93%5Dnq%C2%85b%C3%A9%02n%12c%C2%B60%C3%84m%20%15%C2%B2%C3%A1%3Fk%C2%97%C3%87%C3%88%0A%2F%1D%C3%97%C3%A4%C3%B4%3D%C3%9FP%1EMH%C3%8E%C3%BD%5E%2B%C2%90%20%C2%9F9R%C2%B659%238%7F%C2%B6%C2%B0d%C3%A2%C2%88b%C3%AD%C2%99%C2%BA-%04%C3%93%C2%B8%C3%92%23%C2%95%1C8%C3%AA2r%C3%88'%0E%C3%B9%C3%83%C3%80M%C2%AC%C2%B9%C2%BE%C3%89%C2%8D%C2%90%C3%AE%C3%BA%5D%C3%81v%0CLp%C2%BEqM%0Db%C3%AD%C2%86%C2%BD%C2%85%60%0E%0Bc%15%7Fw%C3%9C%C2%A8%C3%98%C2%91%5E%20wk%C2%8C%C2%95O%1C%C3%A9%C2%99%C2%8A%1F%C3%99N%C3%A3%1CCHw%C3%AF%C2%9E_%5E%C3%B0t%C2%8C%2B%C2%A4%C2%9DhH%C2%81W%C2%8B%7C%3C%C2%A0%2B%C2%B7%C2%A4%7D%C3%81%C3%9E%C3%80J%C3%A4%2C%C2%A4%C3%89%C2%9E%C3%96H%C2%87%C3%B2%C2%BA%06%C2%BC%C2%81%C3%9D8%C2%BAq%09%15%C2%BF%22%1B%7Fj%C2%91w%19%0B%0Eyp%1BIf%1C%C2%BF%C2%AB%C3%B8%C2%A0%C3%A2%C3%88q%C3%9D5%C3%A1%0D%C3%AC%C2%861%3D%17%C2%B43%3D%C2%B9%C3%A3%C2%9A%C3%84%C2%91%5E2%C3%8D%C3%9B%C2%95%C3%80%0F%C3%AD%C2%B80%C3%A2%C3%88q%C3%9D%C2%A9%04%C2%9C%C2%BE%C2%9B%C3%BFX%C3%B8%7B%20_o%607%C2%8A%C3%8D%C2%B8J%15W%C2%B4%C2%BB%C3%99u%C2%92%01%7D%C2%99%25m%C3%88%C3%9B%1D%C2%B4%C3%8F%C2%B9%C2%8A%C2%8B%01%C3%BD%C3%A7%10%C3%91%C3%AE%C3%A6_%1Ao%607%C2%88%C3%8D%C2%B8t2K%C3%9A%C3%8E!%0B%C3%AEY%C2%BExDYr%C3%A3%C3%B8q%C3%845%C3%97%C3%84%0E%C2%BF%C2%86wS%1C%C3%9B%C2%B8%C2%9B%C3%93%3E%0B%C3%A9%C3%84%0E%C3%B9%C3%88%C2%91%C3%AE%C2%92%0FU%C3%BC%C2%83%23%3F%1B%C3%BF%20%C2%84k%17%C3%80%C2%B3%1C%C3%BA%C3%8F%C3%BC%2B%C2%87LF%C2%BB%C3%8F%C2%B0!%C3%81%C3%9E%0B%C3%87%0E%1D%C3%8D%C3%90%C3%90%C3%8C%23%C3%92%C3%B20%C2%B1%3D%C2%BF%5D%3B%C3%BB%C2%B5%0B%C2%A0x%C3%85%7D%C2%BF%C2%A7%12q%C3%9E%2B%04%3E.%C3%9A%22%C3%B2%1E%C3%B9p%C2%9E%1A%22%11%C3%B6%C2%87%C3%B8%C3%90%C2%90%0Bh%17P%2B%C2%8B%7Cb%C3%88%C2%87%C3%9A%C2%B9%40K%C2%8F%C2%B9%C3%8CBr%C3%A8(%C3%97R!%C2%99%C3%B9%C3%BB%C2%8CE%18%C3%A5%C3%88f%C3%96%1F%C3%91%C2%AFW%C2%BF%C2%88%5C%C3%97V%C3%8F%15%19%C2%95W%20%C3%97%C2%9E%1E%C2%8C%C3%B4%C2%98%C2%AE!%C3%86*%C3%8E%C2%94%C2%8E%C2%AF%16%C3%B9L%3B%16*~%C2%A1%C3%9B%C2%8B6%C3%B9%C2%97%C3%8CK%C2%A9t%C2%873%C3%ABE%C3%A9%C3%BD6p%C3%BE%C2%89m%C3%AC%16%7Fe~%23%2F%C2%90%C3%AD%C3%A0%C3%B7%C2%99%C3%B5%5E%3F%C2%9A%C3%A7%12%C2%B4%3D%C2%8F%C3%893%C3%BD%C2%9E%C2%B80drZ%C2%8F%16Y%C3%A4M%0F%C3%95%C3%88'%C2%86%C2%9EB%C2%A5%3FO%C3%BA%22%C3%AB%22%C3%98%C2%9E%C3%87j%10%C2%B4e9%5C(%C2%8F%3D%C3%9Es%C3%B5%C2%82n%5C%C3%90%C2%BA%C3%B7%C3%98%C2%A8%C2%BC%10%7B%C3%83%09%C3%95%C3%B9%40%1D%C3%A7%C3%9A5%C2%A5E%3E%C3%91%C3%8E%C3%9B%0CN%C3%8F'%C2%9Aps%C3%97F%C2%B0M%C3%83%C2%82n%C3%99J.%C2%B3%1C%C2%90%C3%A2%C2%8D%C2%AB%17%C3%8C%C3%99%C3%82%5C%C3%85%C3%8FFzIw%C3%81%C2%B7!6%C3%A2%5C%3B%C2%97%C2%8D%C2%907%C2%87%C2%84%C2%89%C2%8A%C3%9F%C2%B8%C2%AE%C2%9F-T%C2%96%C2%B4%C2%AD%0C%05u%1E%C2%98%7F%C2%BD-%C2%A1%3F%C3%A1%C3%A5%C2%81%C2%9E%C3%A7%12h%C2%BD%C2%8F!%C2%9A%C3%90%C3%AF%C2%99%0Bu.g%C3%98%0B%C2%99C%C3%83%C2%8C%C2%BE%C2%87%0Ch%3D%C3%A7%C3%BE%C2%A4%2F%C2%B3.9%C2%B2%C3%AC%15%C3%9B%C3%B0X%0D%C2%82%C3%A5'o%C2%BC%C3%A7%C2%AA%C3%BB%C3%83Bh%7F%0Er0nR%C2%80%7D%C2%B6-%C2%A2%3F%24l(%2C%C3%B2%C2%89%C3%92S%19%C2%B2%7B%C3%9A%C3%86%19Xtm%C2%9D%C2%80m%C2%AEc%09%C2%BCq%C2%AD%12l%C2%AF%C2%B3%C3%9E%23%C3%B7%C3%8A%3D%22%C2%87%C2%87%C2%A9J%C2%AF%C2%90%06%C3%B4%C3%95%C2%90%C3%8F%C2%8DX'E%C2%BED%C3%94L%C2%BBG%C2%BEM%C2%AA!%C2%A2%C2%9DmJ%C2%99o%0DfI*%C2%AE%C2%A7%C3%9C~%C2%9Dk%09%2C%C2%9E%0B%C2%BA%0F%C2%A8%C2%91%C2%96%1E%C3%A3%C3%AE%C2%AD%02%C2%8B%C3%BA%60%40%3E%C3%96dJ%C2%BA%C3%83L%C3%8F%7C%08%C2%BA%C3%B5%C2%9E%C3%8D%C2%AC%3F%C3%82%C2%AFsY%C2%83%C3%8B%C2%B8%02%C3%9A!%5DE%C3%97%C3%80J%C3%BA%C2%862t%C3%83r%C2%8B%7C%C3%A5%C3%88'%1C%7BG%3D%C2%A3%11%C3%B4%C2%9F%C2%91%C3%A7f%C2%8F7%C2%AE%5Ep%C3%AD-%C2%AC%C3%94My%C2%A7%C3%BF%3E%C2%BA%C3%9C%22oKk%C3%88%1C%C3%B2%C2%A1%C3%92%C2%BBS%C3%B9%08nc%7F%C3%A1%C2%9ATk%17%C3%A0%C2%96%18%C3%9A%C2%B8%5B!%1B%C3%BC%1B%C3%92%C3%80%C3%BEA%C3%B6P%C2%99!%C3%B7%C3%8E%C2%B0q%C3%A5%C3%987%C3%BF%16t%0D%C2%AB%18%2C%C2%A9g%0EB.3Yt%09%C2%9D%C3%97%C2%8FcX%C2%A8%13%C3%90%C2%9D%C3%B5%2B%C3%A8%C3%BF%C2%99%C3%8212%C3%BACC%C3%9B%C2%90%C3%933%3F%C2%82%C3%BE%C3%B2I0%C2%A3%C3%BE%C2%84%C3%BE%7D%C3%B5%C3%83%C3%82%C2%81a%C2%A1N%C2%854%C2%80%C3%A6%C2%9D%17%3B%C2%BA%C2%B3C%C3%85%C2%91%C3%ABC%C3%AC%C3%83%C2%91%17u%C3%AE%C3%98%C3%B5%C2%9Ey%C3%99%01%C3%BF1%C3%9F%C2%B4%C2%BB9%1B%C3%ACQ%C3%9C5%5Ek%C3%A4%C3%9F%C2%B6%C2%86%C3%88%C2%A1%C2%A19%1D%C3%9F%C3%BC%C2%83%24t%C3%BF%09%25%C2%A2%3FM%C3%BBC%C3%A98%C2%8C%2F%C2%A6%C3%A7%0C%04%C3%83%C2%AF!%C2%B8%04%C2%9F%C3%AB%C2%BA%3E%2C%C2%9C%C3%A7%C3%A6%C2%98j%5C%0D!r%0DL0%C3%AE%C2%A7%C3%B3o%C2%B4%2F%C3%8C%2C%C2%A6d%C3%A49%C2%9B%10%C3%B8w%C3%A1%3C%3F%C3%95u%5D-%C2%9C%C3%A7%C3%A68%C3%95%C2%B8t%02%C3%9A%C2%9Fr%C2%84Zz%C2%854%C2%A4%12%3F%0B%C2%B86)%C3%8B%C3%AC%C3%BF%7BWy%C3%AD%C2%8F%3C%C3%87%C3%9F%04%C3%BF%03%04!%1B0%12%C3%BB9l%00%00%00%00IEND%C2%AEB%60%C2%82";
        }
        else {
            var image3_imgString = "%C2%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00%C3%97%00%00%00%26%08%06%00%00%00W%C2%B3%0E%09%00%00%05%C2%B7IDATx%C2%9C%C3%AD%C2%9D%C3%BFq%C2%A3V%10%C3%87%C3%97%C2%99%C3%BCo%C2%AE%02%C2%93%0AD*%C2%B0R%C2%81%C3%A9%C3%A0%C3%A4%0AN%C2%A9%C3%80%C2%BA%0A%C3%82Upr%05%C2%91*%C2%88%5C%C3%81%C2%A1%0A%22U%10T%C2%812%C3%A4%C2%BE%3B%C3%99%C3%9B%C3%99%07%C3%BA%01%18%C3%84~f%18%C3%99%08%C2%81%04%C3%AF%C3%8B%C3%AE%C3%9B%C3%9D%C3%B7%C2%B8%23p%3C%1E%C3%89%C2%B9Y%C2%A6D4'%C2%A2%C3%A8%C3%82%1F%C2%B8%C3%842%23%C2%A2%C2%84%C2%882%22%C3%9Ays%C2%B1%C2%B9%C2%BB%C3%BB.%C2%AB%C2%9F%C2%AF%C3%98GLD)%C2%96%C3%B2%C3%AF%07c%C2%9B%03%11%C3%A5D%C2%B4!%C2%A2%15%C3%BEv%C2%BA%25%C3%82%C2%B9%C2%BF%C2%BF%C3%A2%C2%A8%1Bq%C3%8D%3FAdS%C2%BF%C2%9E%C3%95%C3%BCt%C3%81gf8%C2%A9%7F%13%C3%91%1FD%C3%B4%18%10%16%C3%A1%C2%82%C2%96%C3%AF%C2%BF%10%C3%917%C3%9C%C3%AD%C2%AE%C2%B9%C2%83%3A%C3%A7%C2%93%5C)%2C%C2%8B%7B%08.%C3%B1%C3%AB%11%C3%A6%1Cq%258%C2%A1_%C2%89h%C2%82u%7B%22%C3%BABD%C2%BF%11%C3%91%2F%C2%A5E%14%C3%8B%07%C2%AC%C3%BF%C2%9D%C2%88%C3%96%C3%98%C3%BE%01%C2%82%C3%8Ca%C3%B1%C2%9C%C3%A1%C3%A2%02%C2%AB%C3%A1Tq%C3%8Day%1E%C3%B1%C3%BF%2B%11%C3%BD%0A7a%C2%8E%C2%93%C2%AC%7D%C3%B0%02%C3%AB3%08%C2%A9%14%C3%9Fg%C2%B8%C2%8A%C2%A5%C3%88%C3%BE%C2%84%1F%C3%AFVl%C2%B8%C2%B8%C3%80*8E%5CKX%C2%9B%C2%92-D5%C2%BB%C3%80%C3%9F.%C3%85%C2%B7%C2%80%20%C3%99%C2%92%7D%C3%84%C3%85q%C2%81%0D%17%17X%C2%80%3Aq-!%00%C2%82%C2%B5J%1A%C3%A8%C3%84%16%C2%B0d%C3%8F%C3%B8%7F%C3%A2%02%1B%3C.0%C2%83*qeBX%C3%8F%C2%B0VM1%C3%85%C3%82LDD%C3%8A%19%26.0EH%5C)B%C2%AE%C2%84~%C3%92%C2%B2%C3%A1%C3%A3J%C2%8B%C3%88L%20hg%C2%B8%C3%9C%C2%B7%C3%90V%06%C2%8B%25%C2%AEH%C2%9C%C2%A05%C3%BAIM%C2%92V%C2%84%C3%AE%3F)%C2%8B%C3%A6%0C%C2%8F%C2%89%5B%C2%AF%C3%AFX%C3%A2%C3%8AD%5E%C3%A4%C2%A9%2C%C3%9EPK!%C3%BAG%2B%C3%A3%7Dk%C2%91%C2%82%C2%89k%C2%BE%C2%93%5B%C2%AF%C3%BE%C3%81%C3%97%7B%C2%A1%C3%92-%C2%A1e%C3%B4%C3%89e2%C3%84%15%1B%C3%AE%1As%40Nk%01%C2%81%11%2C%C3%9Cg%C3%A4%C2%BB%2C%C3%96x_%C3%B6%C2%A7V5%C3%9Fi%C3%92p%C3%BF%C2%AE%2Bf%22%C3%B5pk%C3%81%C2%99%C3%94%3D%C2%8A%C3%B3%C3%91%C2%B5%C2%85%C2%99%C3%A8kY%7C%10%C3%82%C2%92%24%C3%88%C2%83i%C2%9E%03%3E%C3%B8F%C3%A4%C3%8C%24%7B%C2%B8%C2%8Co%03%C2%BB%C2%981%C3%AE%C3%96l%C3%B1%C2%B7%C3%B8%C3%BE%C3%96%C2%B9%C3%AA%C2%9A%C3%B2%7B%C3%BC%C3%95%C3%B11%C3%8B%C3%A2%C2%81%C3%91%06%C2%A8%C2%B8%C2%B6P%5B.%C2%AE%C2%9A%C3%B8%12%C3%B8%5C%C2%A8%C2%AA%22%0FX%C2%AF%C3%90%C3%B6!%C3%8B%C3%84B%7C%1C%C3%98%C3%9D%3FV%25F%C2%9E%5Ep~%10%C2%97%2C%C2%BE%C3%8Dp%C3%B7%C3%95T%C2%95%2CY%C3%AE%C3%9ES%C2%A0%C2%81%C3%AD%C3%A0.j%16B%C2%A4C%2F%C2%8Fr%C2%81%C2%8D%1C).v%C3%83%C2%B6h%C3%BCV%60!%24%16%C2%AA%08D%C2%84D%C2%A2%C3%9D%C3%85%03%5E%C3%99%C2%9D%C2%B8%C2%85%C2%88%C2%93%0Bl%C3%84h%C3%8BE%22%C3%92%13%0A%3C%C2%84%5C%C2%BA%C3%9D%C2%99%C3%96n%C2%87%C2%BE%15%C2%93%C2%AB%C3%97%C2%A6%C3%85%15%C3%A1%18%C2%A7D7%C3%8F%5D%C2%AA%C3%BA4.%C2%B0%C2%91b%C2%89%C2%8B%0Bp%0BQ%03(%C2%A9%C2%8A%C3%A4Y%C3%81%C2%8B*kgE%11%C3%9B%0A%C3%A3%26%C2%A2%C2%9A%C2%BFk%5C%60%23%C3%84%12%C2%97%C3%84%12%C3%8B%C2%A4%22W%15%C2%8A%10%C2%9D%C3%92%7F%C3%92%C2%96%C3%92%C2%8A%26%0E%19%C2%AF%40%19%19u%C2%85%C2%BB%2B%C3%91%17%C2%92%C2%84%C3%84%12r%C3%A5B%C3%9B%C2%B3H%C3%9FF2l%C2%BC.%C2%81%C3%AE%C3%9C%10r%C2%98%7F('%C2%B34r_%C2%B3%C3%80%5D8%24%22v%0D%C3%B51X%C2%8C%C2%96%C2%85%C2%B4%C3%BAoC%C2%A7%C3%A9R%C2%B2K%C3%996%C2%98%C2%83kc%C2%A4%C3%B3M%20%C3%85%C2%95%07%C3%BAG%C2%96%C2%B8%C3%985%C2%94%C3%96%26%C3%82%C3%A7%C2%B7F%C3%9E%C2%87%20%3C)%C2%A2X%C3%B4%C2%81Vj%3F%C3%94B%02v%07%2B%C3%BC%5E%0D%C3%A1%C2%B9'%C2%89%C3%95%C3%97%C2%86%2B%60x%C2%84%C2%BA%0BLaY.%C3%AD%C3%9A%C3%A5%C2%A2rB%C2%92*%C3%AB%C3%85Vk%C2%89%7D%C3%A82*-.%0E%C3%BD%C2%AF%C2%95%C2%90%C3%B8%C3%B8M%C2%BB%C2%89%3B%C3%AC%C2%BB%0D%C3%97%2C%11%03J-B%C2%95*%5D%C2%B3m%C2%A1%C2%B4%2CG%3Bx%C3%A9%C3%81%C3%AF%C3%AB%15%C3%9ArQ%20%C2%90%C2%90%19%C2%8DG%C2%BB%C2%86%2C%C2%AE%15%C3%AEdZ%5C%C3%9A5%C2%94%C3%9BKx%7D%1BQ%C3%83%C3%9D%3B%C3%B4%C3%AD%C3%BA%22%2C%C3%AAI9%C3%96h%C2%90%01%C2%8D%C2%8D%08%5E%C3%A8%C2%BE%C2%93%C2%95%C3%B3%C2%92QCv%09%C3%97h%C2%BC%C2%A7%C2%94C%3D%19%C3%BB%C2%96%C2%AE%C3%A2-%C3%94%C2%A6%C3%B5IX%C2%84%C3%B3%C3%9BF%3A%C3%80S%0C%06%3AZ%C3%88%0D%7D%C2%AE%C3%96%C3%AB%C2%84%2F%C2%93%C2%AAW)%14%C2%ABQ%C3%A9%C3%AD%C2%B5K%C3%88.%C3%8B~%60%C3%83%16%2C%C2%8B%C3%907a%11%5C%C3%BB%C2%A6%C3%B3m%C2%B3%C2%9Ab%C3%AF%C3%91%C2%A2%C3%85%25%0BguU%C2%BA%C3%95PX%0C%C2%A7%C2%8A%C2%8B%5D%C3%83%C3%94%C3%98%26%12%C2%A2%1E%C3%9Ah%C3%96%5C%24%C3%9C%0F%3D%15%16Sz%06%C3%BF4X%C2%9D%C3%B2%C2%B5%1F%3F%C2%AB%7Fhqm%C2%84%C2%85%C3%92ac%2B%C3%A7%C3%85%C2%A3N%C2%9F%0C%2BTU%0E%C2%95b_R%C2%8CsD%C2%9C%0E%03M%C2%B6%C3%8E0%7D%5C%C3%A4C%C3%9D%1D%0ALg%C2%BD%40%C2%AD%C3%9C%23%1A%3C7%C3%B4%02b%C3%90%C2%81%C2%8A%C2%95z%C2%95d%C3%86%C2%9D%C2%8DG%3A%C2%BF%C2%8Au%C2%89%C2%886e%03%C3%ADx%17%03%C3%BA%C3%9E%C2%9E%C3%A7%C3%AA%C2%92r%C2%B0%C2%A4X%C2%B2%C3%A3%C3%BF%24b%7Dz%0C%13%C2%A9%7D%10%C3%96%C2%85H%C3%856%3Bl%C2%93%1B%C3%BB%C3%B0%C3%A5%C2%BAe%C2%AA%C3%8E%C3%BF%C2%B2%C3%A1%C3%B3Y%C2%B6%C2%8FB%1D%C2%A3%3C%C3%A6h%C2%AF%1B%13*%7FZ%08%C2%97NN%C2%97%C2%B5%0AD%01_%03w%C3%82P%C3%B1%2F%C2%BB%C2%84%11%C3%B6%C3%BF%C2%80u%3E%C3%85u%C2%BB%C2%B4%C2%99%C3%A7r%14!q%15%08h%1C%C2%8C%C3%B9%C3%A8%2C%C3%B7%C2%AFj%5E%0C%C2%AB%C3%BF%C2%B1BXx%C2%83~%C3%9B%01%C3%87%C3%B3%C3%87%C3%92%C2%B4%C2%8B%C3%A7%C2%B9%3A%C2%A4%C2%AAp%C2%97%05%C2%B6%C2%87%C3%80%C2%BE%C3%81%C2%A2Y%C2%83%1C%C2%AB%C3%84%15*%C3%BE%C3%8D%C2%95%C2%B0%7C%C3%86%C2%A0%C3%B6%C3%B1%3CW%C2%87%C3%94U%C3%85%C3%A7%C2%B0X%C3%AC%22%C2%BE%40%5CR%2Cu%C2%B39Y%C3%9B%7C%14%C2%91A%17Vwx%C2%9E%C2%ABCNy%10C%01%C2%81%C3%B1%C2%9C%17%13%15%1D%C2%AA%13F%1CpG%C3%96b%C3%96%24%C2%A7%3B%3C%C3%8F%C3%95%11%C3%A7%3E%C2%B65%C2%86k%C2%A8%C3%83%C3%B1%075L%C2%9F%C3%BBgV%C2%98%C3%B6%0D%C3%BB%C3%B0%C2%B9%C3%A1%C2%BB%C3%81%C2%A7V%C3%AB%18%C2%9EZ%C3%AD%C3%92g%22%C3%B3s%C2%B9%C2%A6'%0E%C2%9D%C3%9F%C2%8B%093%C3%9DRuK%C2%8C%C2%A7%C2%80vIh~%C3%8BQp%C2%AD%C2%B8%24%C2%91%18%C3%8A!%C2%87s%14%10%C3%92%7BT%C2%A2%3B%3FR7%C3%99kSpuM_%06%C2%85%C2%BE%0B%C3%BF%C2%89%C2%8B%C2%88%C3%BE%05%23l%26%C2%8Crd%C2%8C%C2%92%00%00%00%00IEND%C2%AEB%60%C2%82";
        }
        var imageDatabase = acfInfoGroup.add("image", undefined, File.decode(image3_imgString), { name: "image3" });

        var statictext7 = acfInfoGroup.add("group");
        statictext7.orientation = "column";
        statictext7.alignChildren = ["left", "center"];
        statictext7.spacing = 0;

        statictext7.add("statictext", undefined, "Dieser Modus benötigt die  Plugins Advanced Custom Fields und ACF to REST in", { name: "statictext7" });
        statictext7.add("statictext", undefined, "deiner WordPress Installation", { name: "statictext7" });
        statictext7.add("statictext", undefined, "Wähle einen oder mehrere WordPress Beiträge aus.", { name: "statictext7" });
        statictext7.add("statictext", undefined, "Custom Fields werden anhand ihrer Namen den Datenfeldern oder benannten", { name: "statictext7" });
        statictext7.add("statictext", undefined, "Rahmen auf der ersten Seite des aktiven Dokuments zugeordnet.", { name: "statictext7" });

        rbPlaceGun.onClick = placeGunMode;
        placeGunInfoGroup.addEventListener('mousedown', placeGunMode);
        function placeGunMode() {
            newConfigObject.runMode = RunModes.PLACE_GUN;
            rbPlaceGun.value = true;
            rbTemplate.value = false;
            rbDatabasePublishing.value = false;
            buttonNextMode.enabled = true;
        }

        rbTemplate.onClick = templateMode;
        templateInfoGroup.addEventListener('mousedown', templateMode);
        function templateMode() {
            newConfigObject.runMode = RunModes.TEMPLATE;
            rbPlaceGun.value = false;
            rbTemplate.value = true;
            rbDatabasePublishing.value = false;
            buttonNextMode.enabled = true;
        }

        rbDatabasePublishing.onClick = databaseMode;
        acfInfoGroup.addEventListener('mousedown', databaseMode);
        function databaseMode() {
            newConfigObject.runMode = RunModes.DATABASE;
            rbPlaceGun.value = false;
            rbTemplate.value = false;
            rbDatabasePublishing.value = true;
            buttonNextMode.enabled = true;
        }


        // WIZARDCONTROL
        // =============
        var wizardControl = processingMode.add("group", undefined, { name: "wizardControl" });
        wizardControl.orientation = "row";
        wizardControl.alignChildren = ["right", "center"];
        wizardControl.spacing = 10;
        wizardControl.margins = [0, 10, 0, 0];
        wizardControl.alignment = ["fill", "center"];

        var buttonCancel = wizardControl.add("button", undefined, undefined, { name: "cancel" });
        buttonCancel.text = "Abbrechen";

        buttonCancel.onClick = function () {
            dialog.close(2);
        }

        buttonNextMode = wizardControl.add("button", undefined, undefined, { name: "okMode" });
        buttonNextMode.text = "Weiter";
        buttonNextMode.enabled = true;
        buttonNextMode.onClick = function () {
            processingMode.visible = false;
            filterEntries.visible = true;
            newConfigObject.endPointArray = getEndpoints(newConfigObject.restURL);
            endPointDropdown.removeAll();
            var setNewEndpoint = true;
            for (var f = 0; f < newConfigObject.endPointArray.length; f++) {
                endPointDropdown.add("item", newConfigObject.endPointArray[f]);
                if (newConfigObject.endPoint == newConfigObject.endPointArray[f]) {
                    endPointDropdown.selection = f;
                    setNewEndpoint = false;
                }
            }
            if (setNewEndpoint) {
                endPointDropdown.selection = 0;
                newConfigObject.endPoint = endPointDropdown.selection.text;
            }
            newConfigObject.categoryArray = getCategories(newConfigObject.restURL);
            categoryDropDown.removeAll();
            var setNewCategory = true;
            for (var f = 0; f < newConfigObject.categoryArray.length; f++) {
                var li = categoryDropDown.add("item", newConfigObject.categoryArray[f].name);
                li.categoryID = newConfigObject.categoryArray[f].id
                if (newConfigObject.categoryID == newConfigObject.categoryArray[f].id) {
                    categoryDropDown.selection = f;
                    setNewCategory = false;
                }
            }
            if (setNewCategory) {
                // this triggers onCange() and subsequent getListOfBlogEntries() and fillListboxSelectPost() from else
                categoryDropDown.selection = 0;
                newConfigObject.categoryID = categoryDropDown.selection.categoryID;
            }
            else {
                // Fill
                listItems = getListOfBlogEntries(newConfigObject, loadMaxPages, false);
                fillListboxSelectPost(listItems);
            }

            filterPanel.text = localize(ui.staticTextFilterElements) + " - " + newConfigObject.siteURL;
        }
    }
    function createFilterPanel() {
        filterEntries.orientation = "column";
        filterEntries.alignChildren = ["left", "center"];
        filterEntries.spacing = 10;
        filterEntries.margins = 0;

        // PANEL1
        // ======
        filterPanel = filterEntries.add("panel", undefined, undefined, { name: "filterPanel" });
        filterPanel.text = localize(ui.staticTextFilterElements);
        filterPanel.preferredSize.width = 540;
        filterPanel.preferredSize.height = 170;
        filterPanel.orientation = "column";
        filterPanel.alignChildren = ["left", "top"];
        filterPanel.spacing = 10;
        filterPanel.margins = 10;

        // GROUP1
        // ======
        var group1 = filterPanel.add("group", undefined, { name: "group1" });
        group1.orientation = "column";
        group1.alignChildren = ["left", "center"];
        group1.spacing = 10;
        group1.margins = [0, 10, 0, 0];

        // Set Dates
        var groupDate = group1.add('group');
        groupDate.add('statictext {text: "' + localize(ui.staticTextAftertDate) + '"}');
        var edittextAfterDate = groupDate.add('edittext {text: "' + newConfigObject.filterAfterDate + '", justify:"center", preferredSize:[90, -1]}');
        edittextAfterDate.onChange = function () {
            if (newConfigObject.filterAfterDate == edittextAfterDate.text) {
                return;
            }
            if (isValidDate(edittextAfterDate.text)) {
                newConfigObject.filterAfterDate = edittextAfterDate.text;
                listItems = getListOfBlogEntries(newConfigObject, loadMaxPages, false);
                fillListboxSelectPost(listItems);
            }
            else {
                edittextAfterDate.text = newConfigObject.filterAfterDate;
                alert(localize(ui.datePatternError))
            }
        }
        groupDate.add('statictext {text: "' + localize(ui.staticTextBeforeDate) + '"}');
        var edittextBeforeDate = groupDate.add('edittext {text: "' + newConfigObject.filterBeforeDate + '", justify:"center", preferredSize:[90, -1]}');
        edittextBeforeDate.onChange = function () {
            if (newConfigObject.filterBeforeDate == edittextBeforeDate.text) {
                return;
            }
            if (isValidDate(edittextBeforeDate.text)) {
                newConfigObject.filterBeforeDate = edittextBeforeDate.text;
                listItems = getListOfBlogEntries(newConfigObject, loadMaxPages, false);
                fillListboxSelectPost(listItems);
            }
            else {
                edittextBeforeDate.text = newConfigObject.filterBeforeDate;
                alert(localize(ui.datePatternError))
            }
        }

        groupDate.add("statictext", undefined, localize(ui.staticTextSort));
        var orderByDD = groupDate.add("dropdownlist", undefined, [" " + localize(ui.staticTextSortNew) + " > " + localize(ui.staticTextSortOld), " " + localize(ui.staticTextSortOld) + " > " + localize(ui.staticTextSortNew)]);
        orderByDD.selection = (newConfigObject.orderBy == "desc") ? 0 : 1;
        orderByDD.onChange = function () {
            newConfigObject.orderBy = (orderByDD.selection == 0) ? "desc" : "asc";
            listItems = getListOfBlogEntries(newConfigObject, loadMaxPages, false);
            fillListboxSelectPost(listItems);
        }


        var groupEndpoint = group1.add('group');
        groupEndpoint.add('statictext {text: "' + localize(ui.staticTextEndpointDescription) + '"}');
        endPointDropdown = groupEndpoint.add("dropdownlist", undefined, []);
        groupEndpoint.add('statictext {text: "' + localize(ui.staticTextEndpointDescriptionInfo) + '"}');
        endPointDropdown.preferredSize.width = 120;
        endPointDropdown.preferredSize.height = 24;

        endPointDropdown.onChange = function () {
            newConfigObject.endPoint = endPointDropdown.selection.text;
            listItems = getListOfBlogEntries(newConfigObject, loadMaxPages, false);
            fillListboxSelectPost(listItems);
        }

        var groupCategory = group1.add('group');
        groupCategory.add('statictext {text: "' + localize(ui.staticTextCategoryFile) + '"}');
        categoryDropDown = groupCategory.add("dropdownlist", undefined, []);
        categoryDropDown.preferredSize.width = 200;
        categoryDropDown.preferredSize.height = 24;

        categoryDropDown.onChange = function () {
            newConfigObject.categoryID = categoryDropDown.selection.categoryID;
            listItems = getListOfBlogEntries(newConfigObject, loadMaxPages, false);
            fillListboxSelectPost(listItems);
        }

        var groupRefilter = group1.add('group');
        groupRefilter.orientation = "row";
        stNumberOfEntries = groupRefilter.add("statictext");
        stNumberOfEntries.preferredSize.width = 300;
        var buttonFilter = groupRefilter.add("button", undefined, undefined, { name: "" });
        buttonFilter.text = localize({ de: "Alle Einträge laden", en: "Load all entries" });

        buttonFilter.onClick = function () {
            loadMaxPages = 50;
            listItems = getListOfBlogEntries(newConfigObject, loadMaxPages, false);
            fillListboxSelectPost(listItems);
        }

        var panel2 = filterEntries.add("panel", undefined, localize(ui.panelSelectPost), { name: "panel2" });
        panel2.preferredSize.width = 540;
        panel2.preferredSize.height = 290;
        panel2.orientation = "column";
        panel2.alignChildren = ["left", "top"];
        panel2.spacing = 10;
        panel2.margins = 10;

        var entrySelectionGroup = panel2.add("group", undefined, { name: "group11" });
        entrySelectionGroup.orientation = "column";
        entrySelectionGroup.alignChildren = "fill";
        entrySelectionGroup.spacing = 10;
        entrySelectionGroup.margins = [0, 10, 0, 0];


        etPostFilter = entrySelectionGroup.add('edittext { text: "' + ui.panelSelectPostFilter + '"}');
        etPostFilter.onActivate = function () {
            if (etPostFilter.text == ui.panelSelectPostFilter) {
                etPostFilter.text = "";
            }
        }
        etPostFilter.onChanging = function () {
            fillListboxSelectPost(listItems);
        }

        groupSelectPost = entrySelectionGroup.add('group');
        listboxSelectPost = groupSelectPost.add('listbox {bounds:[' + listBounds + ']}');



        // WIZARDCONTROL
        // =============
        var wizardControl = filterEntries.add("group", undefined, { name: "wizardControl" });
        wizardControl.orientation = "row";
        wizardControl.alignChildren = ["right", "center"];
        wizardControl.spacing = 10;
        wizardControl.margins = [0, 10, 0, 0];
        wizardControl.alignment = ["fill", "center"];

        var buttonCancel = wizardControl.add("button", undefined, undefined, { name: "cancel" });
        buttonCancel.text = "Abbrechen";

        buttonCancel.onClick = function () {
            dialog.close(2);
        }

        buttonStartOkFilterPanel = wizardControl.add("button", undefined, undefined, { name: "ok" });
        buttonStartOkFilterPanel.text = "Start";

        buttonStartOkFilterPanel.onClick = function () {
            dialog.close(1);
        }

        var buttonNext = wizardControl.add("button", undefined, undefined, { name: "buttonNext" });
        buttonNext.text = "Weitere Optionen";
        buttonNext.onClick = function () {
            filterEntries.visible = false;
            if (newConfigObject.runMode == RunModes.PLACE_GUN) {
                optionsPlaceGun.visible = true;
            }
            if (newConfigObject.runMode == RunModes.TEMPLATE) {
                optionsTemplate.visible = true;
            }
            if (newConfigObject.runMode == RunModes.DATABASE) {
                optionsDatabase.visible = true;
            }
        }

    }
    function createOptionsPlaceGun() {
        // GETURL
        // ======
        optionsPlaceGun.orientation = "column";
        optionsPlaceGun.alignChildren = ["left", "center"];
        optionsPlaceGun.spacing = 10;
        optionsPlaceGun.margins = 0;

        // PANEL1
        // ======
        var panel1 = optionsPlaceGun.add("panel", undefined, undefined, { name: "panel1" });
        panel1.text = "Einstellungen PlaceGun";
        panel1.preferredSize.width = 540;
        panel1.preferredSize.height = 510;
        panel1.orientation = "column";
        panel1.alignChildren = ["left", "top"];
        panel1.spacing = 10;
        panel1.margins = 10;

        // GROUP1
        // ======
        var group1 = panel1.add("group", undefined, { name: "group1" });
        group1.orientation = "column";
        group1.alignChildren = ["left", "center"];
        group1.spacing = 10;
        group1.margins = [0, 20, 0, 0];
        group1.add("statictext", undefined, "Platziere Bilder im Textfluss oder einzeln");
        var placeGunImageProcessingSingleFiles = group1.add("radiobutton");
        placeGunImageProcessingSingleFiles.text = "Jedes Bild einzeln in den Platzierungs-Einfügemarke »Place Gun« laden";
        placeGunImageProcessingSingleFiles.value = newConfigObject.loadImagesToPlaceGun;
        placeGunImageProcessingSingleFiles.alignment = ["left", "top"];
        var placeGunImageProcessingAnchor = group1.add("radiobutton");
        placeGunImageProcessingAnchor.text = "Alle Bilder im Textfluss verankern. Pro Eintrag entsteht ein Textfluss!";
        placeGunImageProcessingAnchor.value = !newConfigObject.loadImagesToPlaceGun;
        placeGunImageProcessingAnchor.alignment = ["left", "top"];

        placeGunImageProcessingSingleFiles.onClick = placeGunImageProcessingAnchor.onClick = function () {
            newConfigObject.loadImagesToPlaceGun = placeGunImageProcessingSingleFiles.value;
        }

        var group2 = panel1.add("group", undefined, { name: "group2" });
        group2.orientation = "column";
        group2.alignChildren = ["left", "center"];
        group2.spacing = 10;
        group2.margins = [0, 10, 0, 0];
        group2.add("statictext", undefined, "Beitragsbild/Featured Image verarbeiten");

        var placeGunImageProcessingFeaturedImage = group2.add("checkbox");
        placeGunImageProcessingFeaturedImage.text = "Beitragsbild einsetzen";
        placeGunImageProcessingFeaturedImage.value = newConfigObject.downloadFeaturedImage;
        placeGunImageProcessingFeaturedImage.onClick = function () {
            newConfigObject.downloadFeaturedImage = placeGunImageProcessingFeaturedImage.value;
        }


        // WIZARDCONTROL
        // =============
        var wizardControl = optionsPlaceGun.add("group", undefined, { name: "wizardControl" });
        wizardControl.orientation = "row";
        wizardControl.alignChildren = ["right", "center"];
        wizardControl.spacing = 10;
        wizardControl.margins = [0, 10, 0, 0];
        wizardControl.alignment = ["fill", "center"];

        var buttonCancel = wizardControl.add("button", undefined, undefined, { name: "cancel" });
        buttonCancel.text = "Abbrechen";

        buttonCancel.onClick = function () {
            dialog.close(2);
        }

        buttonStartOkFilterPanel = wizardControl.add("button", undefined, undefined, { name: "ok" });
        buttonStartOkFilterPanel.text = "Start";

        buttonStartOkFilterPanel.onClick = function () {
            dialog.close(1);
        }

        var buttonNext = wizardControl.add("button", undefined, undefined, { name: "buttonNext" });
        buttonNext.text = "Weiter";
        // buttonNext.active = true;
        buttonNext.onClick = function () {
            optionsPlaceGun.visible = false;
            imageOptions.visible = true;
        }
    }
    function createOptionsImages() {
        imageOptions.orientation = "column";
        imageOptions.alignChildren = ["left", "center"];
        imageOptions.spacing = 10;
        imageOptions.margins = 0;

        // PANEL1
        // ======
        var panel1 = imageOptions.add("panel", undefined, undefined, { name: "panel1" });
        panel1.text = localize(ui.imagePanelHead);
        panel1.preferredSize.width = 540;
        panel1.preferredSize.height = 510;
        panel1.orientation = "column";
        panel1.alignChildren = ["left", "top"];
        panel1.spacing = 10;
        panel1.margins = 10;

        // GROUP1
        // ======
        var group1 = panel1.add("group", undefined, { name: "group1" });
        group1.orientation = "column";
        group1.alignChildren = ["left", "center"];
        group1.spacing = 10;
        group1.margins = [0, 20, 0, 0];

        // Panel Image Management
        var groupImageManagementRadioSelect = group1.add("group {spacing:5, alignChildren:['left', 'top'], orientation:'column'}");
        var radioImageManagementDownload = groupImageManagementRadioSelect.add("radiobutton");
        radioImageManagementDownload.text = localize(ui.radioImageManagementDownload);
        radioImageManagementDownload.value = configObject.downloadImages;

        var radioImageManagementLocalFolder = groupImageManagementRadioSelect.add("radiobutton");
        radioImageManagementLocalFolder.text = localize(ui.radioImageManagementLocalFolder);
        radioImageManagementLocalFolder.value = !configObject.downloadImages;

        radioImageManagementDownload.onClick = radioImageManagementLocalFolder.onClick = function () {
            configObject.downloadImages = radioImageManagementDownload.value;
            groupImageManagementFolderSelect.enabled = radioImageManagementLocalFolder.value;
            if (radioImageManagementLocalFolder.value &&
                edittextImageManagementFolder.text == localize(ui.edittextImageManagementFolderStandardText)) {
                chooseFolder();
            }
        }
        var groupImageManagementFolderSelect = group1.add("group");
        groupImageManagementFolderSelect.margins = [20, -10, 0, 0];
        var edittextImageManagementFolder = groupImageManagementFolderSelect.add('edittext', undefined, 'Read only', { readonly: true });
        edittextImageManagementFolder.text = localize(ui.edittextImageManagementFolderStandardText);
        if (configObject.localImageFolder && configObject.localImageFolder.constructor.name == "Folder" && configObject.localImageFolder.exists) {
            var res = configObject.localImageFolder;
            edittextImageManagementFolder.text = (res.parent) ? ".../" + res.parent.name : "";
            if (res.parent && res.parent == "~") edittextImageManagementFolder.text = res.parent;
            edittextImageManagementFolder.text += "/" + res.name; //fsName.toString().substring(0,2000);
        }
        else {
            // TODO eigentlich müsste man warnen, wenn der Ordner nicht mehr existiert ...
            radioImageManagementDownload.value = true;
        }
        groupImageManagementFolderSelect.enabled = radioImageManagementLocalFolder.value;
        edittextImageManagementFolder.preferredSize = [310, -1];

        var buttonImageManagementFolderSelect = groupImageManagementFolderSelect.add('button {text:"' + localize(ui.buttonImageManagementFolderSelect) + '", preferredSize:[80,-1]}');
        buttonImageManagementFolderSelect.onClick = function () {
            chooseFolder();
        }
        function chooseFolder() {
            try {
                try {
                    var inddFolder = app.activeDocument.fullName.parent;
                }
                catch (e) {
                    var inddFolder = Folder.desktop;
                }
                var resFolder = inddFolder.selectDlg(localize(ui.buttonImageManagementFolderSelectOnClick));
            }
            catch (e) {
                var resFolder = Folder.selectDialog(localize(ui.buttonImageManagementFolderSelectOnClick));
            }

            if (resFolder != null) {
                configObject.localImageFolder = resFolder;
                edittextImageManagementFolder.helpTip = resFolder.toString();
                edittextImageManagementFolder.text = (resFolder.parent) ? ".../" + resFolder.parent.name : "";
                if (resFolder.parent && resFolder.parent == "~") edittextImageManagementFolder.text = resFolder.parent;
                edittextImageManagementFolder.text += "/" + resFolder.name; //fsName.toString().substring(0,2000);
            }
            else {
                edittextImageManagementFolder.text = localize(ui.edittextImageManagementFolderStandardText);
                edittextImageManagementFolder.helpTip = "";
                edittextImageManagementFolder.imageFolder = undefined;
            }
        }

        // WIZARDCONTROL
        // =============
        var wizardControl = imageOptions.add("group", undefined, { name: "wizardControl" });
        wizardControl.orientation = "row";
        wizardControl.alignChildren = ["right", "center"];
        wizardControl.spacing = 10;
        wizardControl.margins = [0, 10, 0, 0];
        wizardControl.alignment = ["fill", "center"];

        var buttonCancel = wizardControl.add("button", undefined, undefined, { name: "cancel" });
        buttonCancel.text = "Abbrechen";

        buttonCancel.onClick = function () {
            dialog.close(2);
        }

        buttonStartOkFilterPanel = wizardControl.add("button", undefined, undefined, { name: "ok" });
        buttonStartOkFilterPanel.text = "Start";

        buttonStartOkFilterPanel.onClick = function () {
            dialog.close(1);
        }
    }
    function createOptionsDatabase() {
        // GETURL
        // ======
        optionsDatabase.orientation = "column";
        optionsDatabase.alignChildren = ["left", "center"];
        optionsDatabase.spacing = 10;
        optionsDatabase.margins = 0;

        // PANEL1
        // ======
        var panel1 = optionsDatabase.add("panel", undefined, undefined, { name: "panel1" });
        panel1.text = "Einstellungen variable Datenfelder";
        panel1.preferredSize.width = 540;
        panel1.preferredSize.height = 510;
        panel1.orientation = "column";
        panel1.alignChildren = ["left", "top"];
        panel1.spacing = 10;
        panel1.margins = 10;

        // GROUP1
        // ======
        var group1 = panel1.add("group", undefined, { name: "group1" });
        group1.orientation = "column";
        group1.alignChildren = ["left", "center"];
        group1.spacing = 10;
        group1.margins = [0, 20, 0, 0];
        group1.add("statictext", undefined, "Optionen kommen hier bestimmt auch noch");


        // WIZARDCONTROL
        // =============
        var wizardControl = optionsDatabase.add("group", undefined, { name: "wizardControl" });
        wizardControl.orientation = "row";
        wizardControl.alignChildren = ["right", "center"];
        wizardControl.spacing = 10;
        wizardControl.margins = [0, 10, 0, 0];
        wizardControl.alignment = ["fill", "center"];

        var buttonCancel = wizardControl.add("button", undefined, undefined, { name: "cancel" });
        buttonCancel.text = "Abbrechen";

        buttonCancel.onClick = function () {
            dialog.close(2);
        }

        buttonStartOkFilterPanel = wizardControl.add("button", undefined, undefined, { name: "ok" });
        buttonStartOkFilterPanel.text = "Start";

        buttonStartOkFilterPanel.onClick = function () {
            dialog.close(1);
        }

        var buttonNext = wizardControl.add("button", undefined, undefined, { name: "buttonNext" });
        buttonNext.text = "Weiter";
        // buttonNext.active = true;
        buttonNext.onClick = function () {
            optionsDatabase.visible = false;
            imageOptions.visible = true;
        }
    }
    function createOptionsTemplate() {
        // GETURL
        // ======
        optionsTemplate.orientation = "column";
        optionsTemplate.alignChildren = ["left", "center"];
        optionsTemplate.spacing = 10;
        optionsTemplate.margins = 0;

        // PANEL1
        // ======
        var panel1 = optionsTemplate.add("panel", undefined, undefined, { name: "panel1" });
        panel1.text = "Einstellungen Template";
        panel1.preferredSize.width = 540;
        panel1.preferredSize.height = 510;
        panel1.orientation = "column";
        panel1.alignChildren = ["left", "top"];
        panel1.spacing = 10;
        panel1.margins = 10;


        var group2 = panel1.add("group", undefined, { name: "group2" });
        group2.orientation = "column";
        group2.alignChildren = ["left", "center"];
        group2.spacing = 10;
        group2.margins = [0, 20, 0, 0];
        group2.add("statictext", undefined, "Beitragsbild/Featured Image verarbeiten");

        var placeGunImageProcessingFeaturedImage = group2.add("checkbox");
        placeGunImageProcessingFeaturedImage.text = "Beitragsbild einsetzen";
        placeGunImageProcessingFeaturedImage.value = newConfigObject.downloadFeaturedImage;
        placeGunImageProcessingFeaturedImage.onClick = function () {
            newConfigObject.downloadFeaturedImage = placeGunImageProcessingFeaturedImage.value;
        }


        // WIZARDCONTROL
        // =============
        var wizardControl = optionsTemplate.add("group", undefined, { name: "wizardControl" });
        wizardControl.orientation = "row";
        wizardControl.alignChildren = ["right", "center"];
        wizardControl.spacing = 10;
        wizardControl.margins = [0, 10, 0, 0];
        wizardControl.alignment = ["fill", "center"];

        var buttonCancel = wizardControl.add("button", undefined, undefined, { name: "cancel" });
        buttonCancel.text = "Abbrechen";

        buttonCancel.onClick = function () {
            dialog.close(2);
        }

        buttonStartOkFilterPanel = wizardControl.add("button", undefined, undefined, { name: "ok" });
        buttonStartOkFilterPanel.text = "Start";

        buttonStartOkFilterPanel.onClick = function () {
            dialog.close(1);
        }

        var buttonNext = wizardControl.add("button", undefined, undefined, { name: "buttonNext" });
        buttonNext.text = "Weiter";
        // buttonNext.active = true;
        buttonNext.onClick = function () {
            optionsTemplate.visible = false;
            imageOptions.visible = true;
        }
    }


    // Replace the Listbox with posts
    function fillListboxSelectPost(localListItems) {
        var tempMatcher = escapeRegExpJS(etPostFilter.text.toLowerCase());
        var tempArray = [];
        for (var i = 0; i < localListItems.length; i++) {
            if (etPostFilter.text == ui.panelSelectPostFilter) {
                tempArray.push(localListItems[i].entryTitle + " [" + localListItems[i].id + "]");
            }
            else if ((localListItems[i].entryTitle + "").toLowerCase().match(tempMatcher)) {
                tempArray.push(localListItems[i].entryTitle + " [" + localListItems[i].id + "]");
            }
        }

        // Create the new list with the same bounds as the one it will replace
        tempList = groupSelectPost.add("listbox", listBounds, tempArray, { scrolling: true, multiselect: true });
        tempList.onChange = function () {
            buttonStartOkFilterPanel.enabled = true;
        }
        tempList.onDoubleClick = function (e) {
            dialog.close(1);
        }

        groupSelectPost.remove(listboxSelectPost);
        listboxSelectPost = tempList;

        if (tempArray.length > 0) {
            listboxSelectPost.selection = 0;
        }
        buttonStartOkFilterPanel.enabled = true;
        if (loadMaxPages > 1) {
            stNumberOfEntries.text = "Es wurden " + localListItems.length + " Einträge geladen";
        }
        else {
            stNumberOfEntries.text = "Es wurden nur die 100 neuesten Einträge geladen";
        }

    }

    function discoverRestURL(blogURL) {
        var logURL = blogURL;
        blogURL = blogURL.replace(/\/*\s*$/, "/");
        var restURL = null;
        var ui = {};
        ui.pageNotFound = { en: "URL [%1] not found [%2]", de: "URL [%1] nicht gefunden [%2]" };
        ui.noRESTapiFound = { en: "No REST API found\n[%1]", de: "Keine WordPress Seite oder REST Schnittstelle deaktiviert unter\n[%1]" };
        ui.RESTapiHttpStatus = { en: "Found REST API [%1]\nBut could not connect due to httpStatus[%2]\n[%3]", de: "REST API gefunden [%1]\nEs trat jedoch ein Fehler auf httpStatus[%2]\n[%3]" };

        // Guess the REST-Route for sites in subfolders or simple permalinks
        log.debug("check for rest URL: " + blogURL + "/index.php?rest_route=/");
        // We put the user Agent here because of useless security options of some webservers restriction the REST API to browesers only
        var request = {
            url: blogURL + "/index.php?rest_route=/",
            method: "HEAD",
            headers: px.defaultHeader
        }
        var response = restix.fetch(request);
        // log.info(JSON.stringify(response));
        var restRegex = /<(.+?)>; rel="https:\/\/api.w.org\/"/;
        if (response.error == true) {
            throw Error(localize(ui.pageNotFound, logURL, response.errorMsg));
        }

        if (response.head["link"] != undefined) {
            var restRegexResult = response.head["link"].match(restRegex);
            if (restRegexResult) {
                restURL = restRegexResult[1] + "wp/v2/";
                request = {
                    url: restURL,
                    headers: px.defaultHeader
                }
                var response = restix.fetch(request);
                if (response.httpStatus >= 400) {
                    throw Error(localize(ui.RESTapiHttpStatus, logURL, response.httpStatus, response.body));
                }
                return restURL;
            }
        }


        log.debug("check for rest URL: " + blogURL + "/wp-json");
        // We put the user Agent here because of useless security options of some webservers restriction the REST API to browesers only
        var request = {
            url: blogURL + "/wp-json",
            method: "HEAD",
            headers: px.defaultHeader
        }

        var response = restix.fetch(request);
        // log.info(JSON.stringify(response));
        var restRegex = /<(.+?)>; rel="https:\/\/api.w.org\/"/;
        if (response.error == true) {
            throw Error(localize(ui.pageNotFound, logURL, response.errorMsg));
        }

        if (response.head["link"] != undefined) {
            var restRegexResult = response.head["link"].match(restRegex);
            if (restRegexResult) {
                restURL = restRegexResult[1] + "wp/v2/";
                request = {
                    url: restURL,
                    headers: px.defaultHeader
                }
                var response = restix.fetch(request);
                if (response.httpStatus >= 400) {
                    throw Error(localize(ui.RESTapiHttpStatus, logURL, response.httpStatus, response.body));
                }
                return restURL;
            }
        }

        // Try wordpress.com REST Rewrite
        var wordPressComPrefix = "https://public-api.wordpress.com/wp/v2/sites/"
        var blogURL = blogURL.replace(/^https?:\/\//, "");
        log.debug("Try wordpress.com REST Rewrite: " + wordPressComPrefix + blogURL + "");
        // We put the user Agent here because of useless security options of some webservers restriction the REST API to browesers only
        var request = {
            url: wordPressComPrefix + blogURL,
            method: "HEAD",
            headers: px.defaultHeader
        }

        var response = restix.fetch(request);
        // log.info(JSON.stringify(response));
        var restRegex = /<(.+?)>; rel="https:\/\/api.w.org\/"/;
        if (response.error == true) {
            throw Error(localize(ui.pageNotFound, logURL, response.errorMsg));
        }
        if (response.httpStatus == 404) {
            throw Error(localize(ui.pageNotFound, logURL, "httpStatus 404"));
        }
        if (response.head["link"] != undefined) {
            var restRegexResult = response.head["link"].match(restRegex);
            if (restRegexResult) {
                // <https://public-api.wordpress.com/>; rel="https://api.w.org/" immer gleich
                var restURL = wordPressComPrefix + blogURL;
                return restURL
            }
        }


        throw Error(localize(ui.noRESTapiFound, logURL));
    }

    function getEndpoints(restURL) {
        log.debug("getEndpoints()");
        var endPointArray = ["posts", "pages"];

        // We put the user Agent here because of useless security options of some webservers restriction the REST API to browesers only
        var urlCommandChar = (restURL.match(/\?rest_route/)) ? "&" : "?";
        var request = {
            url: restURL + "types/",
            command: urlCommandChar + "context=embed",
            headers: px.defaultHeader
        }

        var response = restix.fetch(request);
        try {
            if (response.error) {
                throw Error(response.errorMsg);
            }
            var routes = JSON.parse(response.body);
            var endpointCache = {
                "posts": true,
                "pages": true,
                "post": true,
                "page": true,
                "wp_block": true,
                "attachment": true
            }

            for (var endpoint in routes) {
                var endpointName = endpoint.replace(/^\/wp\/v2\/?/, "").replace(/([^\/]+).*/, "$1");
                if (endpointName != "" && endpointCache[endpointName] == undefined) {
                    endpointCache[endpointName] = true;
                    endPointArray.push(endpointName);
                }
            }
        }
        catch (e) {
            var msg = "Could not connect to\n" + restURL + "\n\n" + e;
            log.info(msg);
            log.info(e);
            return endPointArray;
        }
        return endPointArray;
    }

    function getCategories(restURL) {
        var alleObject = { name: localize({ en: "-- ALL --", de: "-- ALLE --" }), id: "-1" };

        // We put the user Agent here because of useless security options of some webservers restriction the REST API to browesers only
        var urlCommandChar = (restURL.match(/\?rest_route/)) ? "&" : "?";
        var request = {
            url: restURL + "categories/",
            command: urlCommandChar + "_fields[]=id&_fields[]=name&per_page=100",
            headers: px.defaultHeader
        }

        var response = restix.fetch(request);
        try {
            if (response.error) {
                throw Error(response.errorMsg);
            }
            var categories = JSON.parse(response.body);
            if (categories.hasOwnProperty("code")) {
                log.info("No categories found");
                return [alleObject];
            }
            categories.unshift(alleObject);
        }
        catch (e) {
            var msg = "Could not connect to\n" + restURL + "\n\n" + e;
            log.info(msg);
            log.info(e);
            return [alleObject];
        }
        log.debug("categories " + JSON.stringify(categories))
        return categories;
    }

    // Adapted for ExtendScript from https://stackoverflow.com/questions/18758772/how-do-i-validate-a-date-in-this-format-yyyy-mm-dd-using-jquery
    function isValidDate(dateString) {
        var d = getDateFromString(dateString);
        if (d) {
            var dString = d.getFullYear() + "-" + pad(d.getMonth() + 1, 2) + "-" + pad(d.getDate(), 2);
            return dString === dateString;
        }
        else {
            return false;
        }
    }

    function getDateFromString(dateString) {
        var regEx = /^(\d{4})-(\d{2})-(\d{2})$/;
        if (!dateString.match(regEx)) return false;  // Invalid format
        var d = new Date();
        d.setMonth((dateString.match(regEx)[2] * 1) - 1)
        d.setDate((dateString.match(regEx)[3] * 1))
        d.setFullYear((dateString.match(regEx)[1] * 1));
        var dNum = d.getTime();
        if (!dNum && dNum !== 0) return false; // NaN value, Invalid date
        return d;
    }

    /**
     * Fetch Blog Posts
     * @param {Object} newConfigObject
     * @param {Number} maxPages Results are paginated by 100 entries, if page > 1 this functions reads until maxPages is reached, or no more entries are found
     * @param {Boolean} verbose
     */
    function getListOfBlogEntries(newConfigObject, maxPages, verbose) {
        var restURL = newConfigObject.restURL;
        var endPoint = newConfigObject.endPoint;
        var beforeDate = newConfigObject.filterBeforeDate;
        var afterDate = newConfigObject.filterAfterDate;
        var categoryID = newConfigObject.categoryID;
        var orderBy = newConfigObject.orderBy;
        var localListItems = [];
        var ui = {};
        ui.noBlogPostsOnSite = { en: "No content entries on [%1] for endpoint [%2]", de: "Keine Inhalte auf [%1] für endpoint [%2]" };
        var urlCommandChar = (restURL.match(/\?rest_route/)) ? "&" : "?";

        for (var page = 1; page <= maxPages; page++) {
            var action = urlCommandChar + "_fields[]=title&_fields[]=id&per_page=100&page=" + page + "&before=" + beforeDate + "T00:00:00&after=" + afterDate + "T00:00:00&filter[orderby]=date&order=" + orderBy;
            if (categoryID && categoryID * 1 > -1) {
                action += "&categories=" + categoryID;
            }
            log.info("fn ListOfBlogEntries: " + restURL + endPoint + "/" + action + " mode verbose " + verbose);

            // We put the user Agent here because of useless security options of some webservers restriction the REST API to browesers only
            var request = {
                url: restURL + endPoint + "/",
                command: action,
                headers: px.defaultHeader
            }
            var response = restix.fetch(request);
            try {
                if (response.error) {
                    throw Error(response.errorMsg);
                }
                var postEmbed = JSON.parse(response.body);
                if (postEmbed.hasOwnProperty("code")) {
                    if (postEmbed.code == "rest_post_invalid_page_number" && maxPages > 1) {
                        log.info("Ende der Paginierung auf Seite [" + page + "]. Es konnte kein Beitrag heruntergeladen werden:\nCode: " + postEmbed.code + " Message: " + postEmbed.message + " httpStatus: " + response.httpStatus);
                        break;
                    }
                    else {
                        var msg = "Es konnte kein Beitrag heruntergeladen werden:\nCode: " + postEmbed.code + " Message: " + postEmbed.message + " httpStatus: " + response.httpStatus;
                        if (verbose) {
                            log.infoAlert(msg);
                        }
                        else {
                            log.info(msg);
                        }
                        return [];
                    }
                }
                if (response.httpStatus >= 400) {
                    log.infoAlert("Fehler httpStatus " + response.httpStatus + "\n" + response.body);
                    return [];
                }
            }
            catch (e) {
                var msg = "Could not connect to\n" + restURL + "\n\n" + e;
                if (verbose) {
                    log.infoAlert(msg);
                }
                else {
                    log.info(msg);
                }
                log.info(e);
                return [];
            }
            for (var i = 0; i < postEmbed.length; i++) {
                localListItems.push({
                    id: postEmbed[i].id,
                    entryTitle: Encoder.htmlDecode(postEmbed[i].title.rendered)
                });
            }
            log.info("localListItems.length " + localListItems.length + " response.httpStatus " + response.httpStatus);
            if (verbose && postEmbed.length == 0 && localListItems.length == 0 && response.httpStatus == 200) {
                log.infoAlert(localize(ui.noBlogPostsOnSite, restURL, endPoint));
                return;
            }
        }
        log.info("Processed [" + localListItems.length + "] entries");

        return localListItems;
    }
}


/**
 * Liest aus einer InDesign-Gruppe die Datenfelder für die JSON-Befüllung aus
 * @param {Page} jsonDatenfeldPage
 */
function getDatenfelder(jsonDatenfeldPage) {
    var jsonDatenfelder = [];
    log.info("Search Datafiles on page " + jsonDatenfeldPage.name);
    for (var i = 0; i < jsonDatenfeldPage.pageItems.length; i++) {
        var pi = jsonDatenfeldPage.pageItems[i].getElements()[0];
        if (pi.textPaths.length > 0) {
            var searchResults = findOrChangeGrep(pi.textPaths[0].parentStory, "<<[a-zA-Z\\d_-]+>>", null, false);
            for (var f = 0; f < searchResults.length; f++) {
                var text = searchResults[f];
                var textFieldName = text.contents.replace(/[><]/g, "");
                log.debug("Setze Textdatenfeld: " + textFieldName);
                jsonDatenfelder.push({
                    fieldName: textFieldName,
                    object: text.getElements()[0],
                    type: jsonFieldType.TEXT
                });
            }
        }
        if (pi.hasOwnProperty("parentStory")) {
            var searchResults = findOrChangeGrep(pi.parentStory, "<<[a-zA-Z\\d_-]+>>", null, false);
            for (var f = 0; f < searchResults.length; f++) {
                var text = searchResults[f];
                var textFieldName = text.contents.replace(/[><]/g, "");
                log.debug("Setze Textdatenfeld: " + textFieldName);
                jsonDatenfelder.push({
                    fieldName: textFieldName,
                    object: text.getElements()[0],
                    type: jsonFieldType.TEXT
                });
            }
        }
        else if (pi.name != "") {
            log.info("Setze Grafikdatenfeld " + pi.name);
            jsonDatenfelder.push({
                fieldName: pi.name,
                object: pi,
                type: jsonFieldType.GRAPHIC
            });
        }
    }
    return jsonDatenfelder;
}

/** Gets a Style by its Name Groups are separated with :
 * @param {Documente|StyleGroup} docOrGroup 
 * @param {String} string 
 * @param {String} property paragraphStyles|characterStyles|cellStyles
 * @returns 
 */
function getStyleByString(docOrGroup, string, property) {
    if (string == '[No character style]') return docOrGroup[property][0];
    if (string == '[No paragraph style]') return docOrGroup[property][0];
    if (string == 'NormalParagraphStyle') return docOrGroup[property][1];
    stringResult = string.match(/^(.*?[^\\]):(.*)$/);
    var styleName = (stringResult) ? stringResult[1] : string;
    styleName = styleName.replace(/\\:/g, ':');
    remainingString = (stringResult) ? stringResult[2] : '';
    var newProperty = (stringResult) ? property.replace(/s$/, '') + 'Groups' : property;
    var styleOrGroup = docOrGroup[newProperty].itemByName(styleName);
    if (remainingString.length > 0 && styleOrGroup.isValid) styleOrGroup = getStyleByString(styleOrGroup, remainingString, property);
    return styleOrGroup;
}

/**
 * Find or change with GREP
 * @param {Object} where An InDesign Object to search within (Document, Story, Text, Table, TextFrame)
 * @param {Object|String} find String or findGrepPreferences.properties to search for
 * @param {Object|String|null} change String or changeGrepPreferences.properties to search for. If null, will only search in object *where* Note: Resulting Array is reversed
 * @param {Boolean} includeMaster Defaults to false
 */
function findOrChangeGrep(where, find, change, includeMaster) {
    if (where.hasOwnProperty("contents")) {
        if (where.contents.length == 0) {
            return;
        }
    }
    if (change == undefined) {
        change = null;
    }
    if (includeMaster == undefined) {
        includeMaster = false;
    }

    // Save Options
    var saveFindGrepOptions = {};
    saveFindGrepOptions.includeFootnotes = app.findChangeGrepOptions.includeFootnotes;
    saveFindGrepOptions.includeHiddenLayers = app.findChangeGrepOptions.includeHiddenLayers;
    saveFindGrepOptions.includeLockedLayersForFind = app.findChangeGrepOptions.includeLockedLayersForFind;
    saveFindGrepOptions.includeLockedStoriesForFind = app.findChangeGrepOptions.includeLockedStoriesForFind;
    saveFindGrepOptions.includeMasterPages = app.findChangeGrepOptions.includeMasterPages;
    if (app.findChangeGrepOptions.hasOwnProperty("searchBackwards")) saveFindGrepOptions.searchBackwards = app.findChangeGrepOptions.searchBackwards;

    // Set Options
    app.findChangeGrepOptions.includeFootnotes = true;
    app.findChangeGrepOptions.includeHiddenLayers = true;
    app.findChangeGrepOptions.includeLockedLayersForFind = false;
    app.findChangeGrepOptions.includeLockedStoriesForFind = false;
    app.findChangeGrepOptions.includeMasterPages = includeMaster;
    if (app.findChangeGrepOptions.hasOwnProperty("searchBackwards")) app.findChangeGrepOptions.searchBackwards = false;

    // Reset Dialog
    app.findGrepPreferences = NothingEnum.nothing;
    app.changeGrepPreferences = NothingEnum.nothing;

    try {
        // Find Change operation
        if (find.constructor.name == "String") {
            app.findGrepPreferences.findWhat = find;
        }
        else {
            app.findGrepPreferences.properties = find;
        }
        if (change != null && change.constructor.name == "String") {
            app.changeGrepPreferences.changeTo = change;
        }
        else if (change != null) {
            app.changeGrepPreferences.properties = change;
        }
        var results = null;
        if (change == null) {
            results = where.findGrep(true);
        }
        else {
            results = where.changeGrep();
        }
    }
    catch (e) {
        throw e;
    }
    finally {
        // Reset Dialog
        app.findGrepPreferences = NothingEnum.nothing;
        app.changeGrepPreferences = NothingEnum.nothing;

        // Reset Options
        app.findChangeGrepOptions.includeFootnotes = saveFindGrepOptions.includeFootnotes;
        app.findChangeGrepOptions.includeHiddenLayers = saveFindGrepOptions.includeHiddenLayers;
        app.findChangeGrepOptions.includeLockedLayersForFind = saveFindGrepOptions.includeLockedLayersForFind;
        app.findChangeGrepOptions.includeLockedStoriesForFind = saveFindGrepOptions.includeLockedStoriesForFind;
        app.findChangeGrepOptions.includeMasterPages = saveFindGrepOptions.includeMasterPages;
        if (app.findChangeGrepOptions.hasOwnProperty("searchBackwards")) app.findChangeGrepOptions.searchBackwards = saveFindGrepOptions.searchBackwards;
    }

    return results;
}


/** Pad a numer witth leading zeros */
function pad(number, length, fill) {
    if (fill == undefined) fill = "0";
    var str = '' + number;
    while (str.length < length) {
        str = fill + str;
    }
    return str;
}

function escapeRegExpJS(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Unique an array
 * @param {*} arr
 */
function unique(arr) {
    var hash = {}, result = [];
    for (var i = 0, l = arr.length; i < l; ++i) {
        if (!hash.hasOwnProperty(arr[i])) { //it works with objects! in FF, at least
            hash[arr[i]] = true;
            result.push(arr[i]);
        }
    }
    return result;
}

function findDocumentPath(dok) {
    if (!dok.saved) {
        if (log.confirm("Das Dokument muss zuerst gespeichert werden!\rSpeichern und fortfahren?", undefined, "Dokument ist nicht gespeichert")) {
            try {
                app.scriptPreferences.userInteractionLevel = UserInteractionLevels.INTERACT_WITH_ALL;
                dok = dok.save();
            } catch (e) {
                log.warn("Die Datei konnte nicht gespeichert werden.\n" + e);
                return false;
            }
        }
        else { // User does not want to save -> exit;
            return false;
        }
    }
    px.documentFolder = dok.fullName.parent;
    return dok;
}

function setDefaultValues(dok) {
    var oldValues = {
        horizontalMeasurementUnits: dok.viewPreferences.horizontalMeasurementUnits,
        verticalMeasurementUnits: dok.viewPreferences.verticalMeasurementUnits,
        rulerOrigin: dok.viewPreferences.rulerOrigin,
        zeroPoint: dok.zeroPoint,
        textDefaultParStyle: dok.textDefaults.appliedParagraphStyle,
        textDefaultCharStyle: dok.textDefaults.appliedCharacterStyle,
        transformReferencePoint: dok.layoutWindows[0].transformReferencePoint,
        smartTextReflow: dok.textPreferences.smartTextReflow,
        preflightOff: app.preflightOptions.preflightOff

    }
    dok.textDefaults.appliedCharacterStyle = dok.characterStyles[0];
    dok.textDefaults.appliedParagraphStyle = dok.paragraphStyles[1];
    //~ 	px.idDocument.pageItemDefaults.appliedGraphicObjectStyle
    //~ 	px.idDocument.pageItemDefaults.appliedGridObjectStyle
    //~ 	px.idDocument.pageItemDefaults.appliedTextObjectStyle
    dok.viewPreferences.horizontalMeasurementUnits = MeasurementUnits.MILLIMETERS;
    dok.viewPreferences.verticalMeasurementUnits = MeasurementUnits.MILLIMETERS;
    dok.viewPreferences.rulerOrigin = RulerOrigin.PAGE_ORIGIN;
    dok.zeroPoint = [0, 0];
    dok.textPreferences.smartTextReflow = false;
    app.preflightOptions.preflightOff = true;

    dok.layoutWindows[0].transformReferencePoint = AnchorPoint.TOP_LEFT_ANCHOR;
    return oldValues;
}
/**
* Set Measurement as given in values
*/
function setValues(dok, values) {
    dok.viewPreferences.horizontalMeasurementUnits = values.horizontalMeasurementUnits;
    dok.viewPreferences.verticalMeasurementUnits = values.verticalMeasurementUnits;
    dok.viewPreferences.rulerOrigin = values.rulerOrigin;
    dok.zeroPoint = values.zeroPoint;
    dok.textPreferences.smartTextReflow = values.smartTextReflow;
    app.preflightOptions.preflightOff = values.preflightOff;

    if (values.textDefaultParStyle.isValid) {
        dok.textDefaults.appliedParagraphStyle = values.textDefaultParStyle;
    }
    if (values.textDefaultCharStyle.isValid) {
        dok.textDefaults.appliedCharacterStyle = values.textDefaultCharStyle;
    }

    dok.layoutWindows[0].transformReferencePoint = values.transformReferencePoint;
}

/* Search Template File */
function getTemplateFile(configObject) {
    var scriptFolderPath = getScriptFolderPath();
    var templatePath = Folder(scriptFolderPath + "/templates");
    var templateFile = File(templatePath + "/" + configObject.styleTemplateFile);
    if (templateFile.exists) {
        return templateFile;
    }

    var templateFiles = templatePath.getFiles();
    for (var i = 0; i < templateFiles.length; i++) {
        var templateFile = templateFiles[i];
        if (templateFile.alias) {
            var templateFile = templateFile.resolve();
        }
        if (templateFile.name.match(/\.indd$/)) {
            return templateFile;
        }
        else if (templateFile.name.match(/\.idml$/)) {
            return templateFile;
        }
        else if (templateFile.name.match(/\.indt$/)) {
            return templateFile;
        }
    }
    return null;
}

function getFileNameFromURL(fileURL) {
    var fileName = fileURL.split("/").pop();
    fileName = fileName.replace(/\?.+?$/, "");
    fileName = decodeURI(fileName);
    // Delete wrong HFS diacritics https://mathiasbynens.be/notes/javascript-unicode#accounting-for-lookalikes
    var regexSymbolWithCombiningMarks = /((?:[\0-\u02FF\u0370-\u0482\u048A-\u0590\u05BE\u05C0\u05C3\u05C6\u05C8-\u060F\u061B-\u064A\u0660-\u066F\u0671-\u06D5\u06DD\u06DE\u06E5\u06E6\u06E9\u06EE-\u0710\u0712-\u072F\u074B-\u07A5\u07B1-\u07EA\u07F4-\u0815\u081A\u0824\u0828\u082E-\u0858\u085C-\u08D3\u08E2\u0904-\u0939\u093D\u0950\u0958-\u0961\u0964-\u0980\u0984-\u09BB\u09BD\u09C5\u09C6\u09C9\u09CA\u09CE-\u09D6\u09D8-\u09E1\u09E4-\u0A00\u0A04-\u0A3B\u0A3D\u0A43-\u0A46\u0A49\u0A4A\u0A4E-\u0A50\u0A52-\u0A6F\u0A72-\u0A74\u0A76-\u0A80\u0A84-\u0ABB\u0ABD\u0AC6\u0ACA\u0ACE-\u0AE1\u0AE4-\u0AF9\u0B00\u0B04-\u0B3B\u0B3D\u0B45\u0B46\u0B49\u0B4A\u0B4E-\u0B55\u0B58-\u0B61\u0B64-\u0B81\u0B83-\u0BBD\u0BC3-\u0BC5\u0BC9\u0BCE-\u0BD6\u0BD8-\u0BFF\u0C04-\u0C3D\u0C45\u0C49\u0C4E-\u0C54\u0C57-\u0C61\u0C64-\u0C80\u0C84-\u0CBB\u0CBD\u0CC5\u0CC9\u0CCE-\u0CD4\u0CD7-\u0CE1\u0CE4-\u0CFF\u0D04-\u0D3A\u0D3D\u0D45\u0D49\u0D4E-\u0D56\u0D58-\u0D61\u0D64-\u0D81\u0D84-\u0DC9\u0DCB-\u0DCE\u0DD5\u0DD7\u0DE0-\u0DF1\u0DF4-\u0E30\u0E32\u0E33\u0E3B-\u0E46\u0E4F-\u0EB0\u0EB2\u0EB3\u0EBA\u0EBD-\u0EC7\u0ECE-\u0F17\u0F1A-\u0F34\u0F36\u0F38\u0F3A-\u0F3D\u0F40-\u0F70\u0F85\u0F88-\u0F8C\u0F98\u0FBD-\u0FC5\u0FC7-\u102A\u103F-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u1090-\u1099\u109E-\u135C\u1360-\u1711\u1715-\u1731\u1735-\u1751\u1754-\u1771\u1774-\u17B3\u17D4-\u17DC\u17DE-\u180A\u180E-\u1884\u1887-\u18A8\u18AA-\u191F\u192C-\u192F\u193C-\u1A16\u1A1C-\u1A54\u1A5F\u1A7D\u1A7E\u1A80-\u1AAF\u1ABF-\u1AFF\u1B05-\u1B33\u1B45-\u1B6A\u1B74-\u1B7F\u1B83-\u1BA0\u1BAE-\u1BE5\u1BF4-\u1C23\u1C38-\u1CCF\u1CD3\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1CFA-\u1DBF\u1DFA\u1E00-\u20CF\u20F1-\u2CEE\u2CF2-\u2D7E\u2D80-\u2DDF\u2E00-\u3029\u3030-\u3098\u309B-\uA66E\uA673\uA67E-\uA69D\uA6A0-\uA6EF\uA6F2-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA828-\uA87F\uA882-\uA8B3\uA8C6-\uA8DF\uA8F2-\uA925\uA92E-\uA946\uA954-\uA97F\uA984-\uA9B2\uA9C1-\uA9E4\uA9E6-\uAA28\uAA37-\uAA42\uAA44-\uAA4B\uAA4E-\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2-\uAAEA\uAAF0-\uAAF4\uAAF7-\uABE2\uABEB\uABEE-\uD7FF\uE000-\uFB1D\uFB1F-\uFDFF\uFE10-\uFE1F\uFE30-\uFFFF]|\uD800[\uDC00-\uDDFC\uDDFE-\uDEDF\uDEE1-\uDF75\uDF7B-\uDFFF]|[\uD801\uD803\uD808-\uD819\uD81C-\uD82E\uD830-\uD833\uD835\uD837\uD839\uD83B-\uDB3F\uDB41-\uDBFF][\uDC00-\uDFFF]|[\uD802\uD806][\uDC00-\uDE00\uDE04\uDE07-\uDE0B\uDE10-\uDE37\uDE3B-\uDE3E\uDE40-\uDEE4\uDEE7-\uDFFF]|\uD804[\uDC03-\uDC37\uDC47-\uDC7E\uDC83-\uDCAF\uDCBB-\uDCFF\uDD03-\uDD26\uDD35-\uDD72\uDD74-\uDD7F\uDD83-\uDDB2\uDDC1-\uDDC9\uDDCD-\uDE2B\uDE38-\uDE3D\uDE3F-\uDEDE\uDEEB-\uDEFF\uDF04-\uDF3B\uDF3D\uDF45\uDF46\uDF49\uDF4A\uDF4E-\uDF56\uDF58-\uDF61\uDF64\uDF65\uDF6D-\uDF6F\uDF75-\uDFFF]|\uD805[\uDC00-\uDC34\uDC47-\uDCAF\uDCC4-\uDDAE\uDDB6\uDDB7\uDDC1-\uDDDB\uDDDE-\uDE2F\uDE41-\uDEAA\uDEB8-\uDF1C\uDF2C-\uDFFF]|\uD807[\uDC00-\uDC2E\uDC37\uDC40-\uDC91\uDCA8\uDCB7-\uDD30\uDD37-\uDD39\uDD3B\uDD3E\uDD46\uDD48-\uDFFF]|\uD81A[\uDC00-\uDEEF\uDEF5-\uDF2F\uDF37-\uDFFF]|\uD81B[\uDC00-\uDF50\uDF7F-\uDF8E\uDF93-\uDFFF]|\uD82F[\uDC00-\uDC9C\uDC9F-\uDFFF]|\uD834[\uDC00-\uDD64\uDD6A-\uDD6C\uDD73-\uDD7A\uDD83\uDD84\uDD8C-\uDDA9\uDDAE-\uDE41\uDE45-\uDFFF]|\uD836[\uDC00-\uDDFF\uDE37-\uDE3A\uDE6D-\uDE74\uDE76-\uDE83\uDE85-\uDE9A\uDEA0\uDEB0-\uDFFF]|\uD838[\uDC07\uDC19\uDC1A\uDC22\uDC25\uDC2B-\uDFFF]|\uD83A[\uDC00-\uDCCF\uDCD7-\uDD43\uDD4B-\uDFFF]|\uDB40[\uDC00-\uDCFF\uDDF0-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]))((?:[\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08D4-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AFA-\u0AFF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C00-\u0C03\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0D00-\u0D03\u0D3B\u0D3C\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D82\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u180B-\u180D\u1885\u1886\u18A9\u1920-\u192B\u1930-\u193B\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F\u1AB0-\u1ABE\u1B00-\u1B04\u1B34-\u1B44\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BF3\u1C24-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF2-\u1CF4\u1CF7-\u1CF9\u1DC0-\u1DF9\u1DFB-\u1DFF\u20D0-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA66F-\uA672\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA880\uA881\uA8B4-\uA8C5\uA8E0-\uA8F1\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9E5\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F]|\uD800[\uDDFD\uDEE0\uDF76-\uDF7A]|\uD802[\uDE01-\uDE03\uDE05\uDE06\uDE0C-\uDE0F\uDE38-\uDE3A\uDE3F\uDEE5\uDEE6]|\uD804[\uDC00-\uDC02\uDC38-\uDC46\uDC7F-\uDC82\uDCB0-\uDCBA\uDD00-\uDD02\uDD27-\uDD34\uDD73\uDD80-\uDD82\uDDB3-\uDDC0\uDDCA-\uDDCC\uDE2C-\uDE37\uDE3E\uDEDF-\uDEEA\uDF00-\uDF03\uDF3C\uDF3E-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF57\uDF62\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC35-\uDC46\uDCB0-\uDCC3\uDDAF-\uDDB5\uDDB8-\uDDC0\uDDDC\uDDDD\uDE30-\uDE40\uDEAB-\uDEB7\uDF1D-\uDF2B]|\uD806[\uDE01-\uDE0A\uDE33-\uDE39\uDE3B-\uDE3E\uDE47\uDE51-\uDE5B\uDE8A-\uDE99]|\uD807[\uDC2F-\uDC36\uDC38-\uDC3F\uDC92-\uDCA7\uDCA9-\uDCB6\uDD31-\uDD36\uDD3A\uDD3C\uDD3D\uDD3F-\uDD45\uDD47]|\uD81A[\uDEF0-\uDEF4\uDF30-\uDF36]|\uD81B[\uDF51-\uDF7E\uDF8F-\uDF92]|\uD82F[\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD838[\uDC00-\uDC06\uDC08-\uDC18\uDC1B-\uDC21\uDC23\uDC24\uDC26-\uDC2A]|\uD83A[\uDCD0-\uDCD6\uDD44-\uDD4A]|\uDB40[\uDD00-\uDDEF])+)/g;
    fileName = fileName.replace(regexSymbolWithCombiningMarks, '$1');
    fileName = encodeURI(fileName)
    fileName = fileName.replace(/%/g, "");
    if (fileName == "main.php") {
        fileName = new Date().getTime() + Math.random().toString().replace(/\./, '') + ".jpg";
    }
    return fileName;
}

function untag(xmlElement) {
    while (xmlElement.xmlElements.length > 0) {
        xmlElement.xmlElements[-1].untag();
    }
    while (xmlElement.xmlAttributes.length > 0) {
        xmlElement.xmlAttributes[-1].remove();
    }
    // TODO Text im Root Element entfernen vorher aber checken, das kein PageItem mehr verbunden ist. xmlElement.contents = "";
}

/**
 * Fortschrittsanzeige
 */
function createProgressbar() {

    progressbar = new Window("palette", undefined, undefined, { borderless: true });
    progressbar.spacing = 10;
    progressbar.margins = [10, 10, 10, 10];
    progressbar.alignChildren = ["fill", "center"];
    var titelText = progressbar.add("statictext");
    titelText.characters = 30;
    titelText.justify = "center";

    var labelText = progressbar.add("statictext");
    labelText.justify = "center";

    var progressbarBar = progressbar.add("progressbar", undefined, 0, 0);
    progressbarBar.minimumSize.width = 380;
    progressbarBar.maximumSize.height = 6;


    progressbar.init = function (title, max) {
        titelText.text = (title && title.toString()) || "";
        progressbarBar.maxvalue = (max && !isNaN(max) && Number(max)) || 0;
        this.show();
    };

    progressbar.step = function (label, step) {
        labelText.text = (label && label.toString()) || "";
        progressbarBar.value = (step && !isNaN(step) && Number(step)) || progressbarBar.value + 1;
        this.update();
    };
}


function readConfigFilesAndFolders(dok, book) {
    var isFolderPathRegex = /^(.+Folder)Path$/;
    var isFilePathRegex = /^(.+File)Path$/;
    var isWinRegex = /Win(Folder|File)Path$/;
    var isMacRegex = /Mac(Folder|File)Path$/;


    for (var key in px) {
        // skip loop if the property is from prototype
        if (!px.hasOwnProperty(key)) continue;

        if (File.fs == "Windows") {
            if (key.match(isMacRegex)) continue;
        }
        else {
            if (key.match(isWinRegex)) continue;
        }

        // Folder
        if (key.match(isFolderPathRegex)) {
            var folderPath = px[key];
            var newKeyName = key.match(isFolderPathRegex)[1];
            newKeyName = newKeyName.replace(/(Win|Mac)Folder/, "Folder");
            log.writeln(newKeyName + " -> " + folderPath);

            if (folderPath.match(/\[:NONE:\]/)) continue;
            if (folderPath.match(/^\[:SCRIPT:\]/)) {
                folderPath = folderPath.replace(/^\[:SCRIPT:\]\/?/, "");
                folderPath = getScriptFolderPath() + "/" + folderPath;
            }
            else if (folderPath.match(/^\[:DOCUMENT:\]/)) {
                folderPath = folderPath.replace(/^\[:DOCUMENT:\]\/?/, "");
                try {
                    var dokFolderPath = dok.fullName.parent;
                } catch (e) {
                    try {
                        var dokFolderPath = Folder.selectDialog("Bitte bestimmen Sie den Dokumentordner");
                        if (dokFolderPath == null) {
                            log.warn("Dokumentordner nicht ausgewählt, Setze Dokumentpfad auf Desktop!");
                            dokFolderPath = Folder.desktop;
                        }
                    }
                    catch (e) {
                        log.warn(e);
                        log.warn("Dokumentordner nicht ermittelbar, Setze Dokumentpfad auf Desktop!");
                        dokFolderPath = Folder.desktop;
                    }
                }
                folderPath = dokFolderPath + "/" + folderPath;
            }
            if (folderPath.match(/^\[:BOOK:\]/)) {
                folderPath = folderPath.replace(/^\[:BOOK:\]\/?/, "");
                try {
                    var bookFolderPath = book.fullName.parent;
                } catch (e) {
                    try {
                        var bookFolderPath = Folder.selectDialog("Bitte bestimmen Sie den Buchordner");
                        if (bookFolderPath == null) {
                            log.warn("Buchordner nicht ausgewählt, Setze Buchpfad auf Desktop!");
                            bookFolderPath = Folder.desktop;
                        }
                    }
                    catch (e) {
                        log.warn(e);
                        log.warn("Buchordner nicht ermittelbar, Setze Buchpfad auf Desktop!");
                        bookFolderPath = Folder.desktop;
                    }
                }
                folderPath = bookFolderPath + "/" + folderPath;
            }

            var folderPath = Folder(folderPath)
            if (!folderPath.exists) { // [:SELECT:] wird nie existieren 
                log.info("Benutzer wählt Pfad für [" + key + "]");
                if (px[newKeyName + "PathDialog"] !== undefined) {
                    var msg = px[newKeyName + "PathDialog"]
                }
                else {
                    var msg = "Bitte wählen Sie den Ordner für [" + key + "]";
                }
                folderPath = Folder.selectDialog(msg);
                if (folderPath == null) return false; // User canceled
            }
            if (!folderPath.exists) {
                log.warn("Der Ordner [" + folderPath + "] konnte nicht gefunden werden!");
                return false;
            }
            px[newKeyName] = folderPath;
            log.info("Die Eigenschaft [" + newKeyName + "] wurde auf den Ordner [" + folderPath + "] gesetzt.");
        }
        else if (key.match(isFilePathRegex)) {
            var filePath = px[key];
            var newKeyName = key.match(isFilePathRegex)[1];
            newKeyName = newKeyName.replace(/(Win|Mac)File/, "File");
            log.writeln(newKeyName + " -> " + filePath);

            if (filePath.match(/\[:NONE:\]/)) continue;
            if (filePath.match(/^\[:SCRIPT:\]/)) {
                filePath = filePath.replace(/^\[:SCRIPT:\]\/?/, "");
                filePath = getScriptFolderPath() + "/" + filePath;
            }
            var filePath = File(filePath);
            if (!filePath.exists) { // [:SELECT:] wird nie existieren 
                log.info("Benutzer wählt Pfad für [" + key + "]");
                if (px[newKeyName + "PathDialog"] !== undefined) {
                    var msg = px[newKeyName + "PathDialog"]
                }
                else {
                    var msg = "Bitte wählen Sie die Datei für [" + key + "]";
                }
                filePath = File.openDialog(msg, getFileFilter(px[newKeyName + "PathFilter"]));
                if (filePath == null) return false; // User canceled
            }
            if (!filePath.exists) {
                log.warn("Der Datei [" + filePath + "] konnte nicht gefunden werden!");
                return false;
            }

            px[newKeyName] = filePath;
            log.info("Die Eigenschaft [" + newKeyName + "] wurde auf die Datei [" + filePath + "] gesetzt.");

        }
    }
    return true;
}


/**
* Returns a File-Filter for a File-Dialog
* @param {String} filter The File filter string in Windows Syntax: A filter expression such as "Javascript files:*.jsx;All files:*.*".
* @return {String|Function} The Filter String for Windows, the Filter Function for MacOS
*/
function getFileFilter(fileFilter) {
    if (fileFilter == undefined || File.fs == "Windows") {
        return fileFilter;
    }
    else {
        // Mac
        var extArray = fileFilter.split(":")[1].split(",");
        return function fileFilter(file) {
            if (file.constructor.name === "Folder") return true;
            if (file.alias) return true;
            for (var e = 0; e < extArray.length; e++) {
                var ext = extArray[e];
                ext = ext.replace(/\*/g, "");
                // log.writeln(ext);
                // log.writeln(file.name);
                // log.writeln(file.name.slice(ext.length * -1) === ext);
                // log.writeln("---")
                if (file.name.slice(ext.length * -1) === ext) return true;
            }
        }
    }
}


/** Init Log File and System */
function initLog() {
    var version = "-1";
    var projectName = "noProjectName";
    var appendLog = true;
    var debug = false;
    var logFolderName = "log";
    if (typeof px != "undefined") {
        var version = px.version
        var appendLog = px.appendLog;
        var debug = px.debug;
        if (px.logFolderName) logFolderName = px.logFolderName;
    }
    var scriptFolderPath = getScriptFolderPath();
    if (scriptFolderPath.fullName.match(/lib$/)) {
        scriptFolderPath = scriptFolderPath.parent;
    }

    var logFolder = Folder(scriptFolderPath + "/" + logFolderName + "/");
    if (!logFolder.create()) {
        // Schreibe Log auf den Desktop
        logFolder = Folder(Folder.desktop + "/indesign-log/");
        logFolder.create();
    }
    projectName = px.projectName.replace(/:/g, "_");
    if (appendLog) {
        var logFile = File(logFolder + "/" + projectName + "_" + getUserName() + "_log.txt");
    }
    else {
        var logFile = File(logFolder + "/" + getFormattedDateString(new Date()) + "_" + projectName + "_" + getUserName() + "_log.txt");
    }
    if (debug) {
        log = idsLog.getLogger(logFile, "DEBUG", true);
        log.clearLog();
    }
    else {
        log = idsLog.getLogger(logFile, "INFO", false);
    }
    log.warnInfo("Starte " + projectName + " v " + version + " Debug: " + debug + " ScriptPrefVersion: " + app.scriptPreferences.version + " InDesign v " + app.version);
    return logFile;
}

/** Returns a formatted String  */
function getFormattedDateString(date, addTime) {
    if (addTime) {
        return date.getFullYear() + "-" + pad(date.getMonth() + 1, 2) + "-" + pad(date.getDate(), 2) + "_" + pad(date.getHours(), 2) + "-" + pad(date.getMinutes(), 2) + "-" + pad(date.getSeconds(), 2);
    }
    else {
        return date.getFullYear() + "-" + pad(date.getMonth() + 1, 2) + "-" + pad(date.getDate(), 2)
    }
}

/** Pad a number with leading zeros 
 * @param {Number} number 
 * @param {Number} length 
 * @param {String} fill 
 * @returns {String}
 */
function pad(number, length, fill) {
    if (fill == undefined) fill = "0";
    var str = '' + number;
    while (str.length < length) {
        str = fill + str;
    }
    return str;
}

/** Get os specific user name
 * @returns {String} current user name
 */
function getUserName() {
    if (File.fs == "Windows") {
        return $.getenv("USERNAME");
    }
    else {
        return $.getenv("USER");
    }
}

/** Get Filepath from current script  
 * @returns {Folder} script folder  
*/
function getScriptFolderPath() {
    var skriptPath;
    try {
        skriptPath = app.activeScript.parent;
    }
    catch (e) {
        /* We're running from the VSC */
        skriptPath = File(e.fileName).parent;
    }
    if (skriptPath.toString().match(/\/lib$/)) {
        skriptPath = skriptPath.parent;
    }
    return skriptPath;
}