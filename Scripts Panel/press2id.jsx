//DESCRIPTION:press2id – Place Post from Wordpress Blogs 
//Author: Gregor Fellenz - http://www.publishingx.de

//@include "lib/encoder.js"
//@include "lib/json2.js"
//@include "lib/idsLog.jsx"
//@include "lib/idsTools2.jsx"
//@include "lib/ProgressBar.jsx"
//@include "lib/restix.jsx"

var px = {
	projectName: "press2id",
	version: "2020-01-20-v1.2",

	blogURL: "https://www.publishingx.de/press2id/",
	//	blogURL:"https://www.indesignblog.com", 
	//~ 	blogURL:"https://www.publishingx.de", 
	//~ 	blogURL:"https://www.publishingblog.ch", 
	//~ 	blogURL:"https://wordpress.org/news", 
	//~ 	blogURL:"http://www.indesignblog.de", 
	//~ 	blogURL:"https://www.rolanddreger.net/de",

	// Verwaltung
	showGUI: true,
	debug: true
}

// Debug Stuff
if (app.extractLabel("px:debugID") == "Jp07qcLlW3aDHuCoNpBK_Gregor-") {
	px.showGUI = true;
	px.debug = true;
}

if (app.extractLabel("px:debugID") == "Jp07qcLlW3aDHuCoNpBK_Gregor-") {
	app.insertLabel("wp2id:blogURL", px.blogURL);
	px.debugPost = { postObject: { id: 9, blogTitle: "Debug Run 9" }, downloadImages: true, localImageFolder: Folder("/Users/hp/oc/publishingX/15-Auftraege/2018-02-26_Wordpress2ID/Links"), blogURL: px.blogURL };
}

main();

function main() {
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

	var dok = app.documents[0];
	log.info("Verarbeite Datei: " + dok.name);

	var ial = app.scriptPreferences.userInteractionLevel;
	var redraw = app.scriptPreferences.enableRedraw;
	var scriptPrefVersion = app.scriptPreferences.version;



	try {
		dok = findDocumentPath(dok);
		var oldVals = idsTools.resetDefaults(dok);

		if (dok && dok.isValid) {

			app.scriptPreferences.userInteractionLevel = UserInteractionLevels.NEVER_INTERACT;
			app.scriptPreferences.enableRedraw = false;
			app.scriptPreferences.version = parseInt(app.version);
			log.info("processDok: app.scriptPreferences.version " + app.scriptPreferences.version + " app.version " + app.version);

			if (checkDok(dok)) {
				processDok(dok);
			}
		}
	}
	catch (e) {
		log.warn(e);
	}
	finally {
		idsTools.setDefaults(dok, oldVals);
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
	return dok;
}


/* Functions with main functionality */
function checkDok(dok) {
	var ui = {}
	ui.noTemplate = { en: "Could not find a template file in folder [templates] next to the script.", de: "Es konnte keine Vorlagendatei im Ordner [templates] neben dem Skript gefunden werden." };

	var templateFile = getTemplateFile();
	if (templateFile == null) {
		log.warn(localize(ui.noTemplate));
		return false;
	}

	return true;
}

function processDok(dok) {
	var ui = {}
	ui.couldNotOpenTemplate = { en: "Could not open Template %1", de: "Konnte Template %1 nicht öffnen." };
	ui.progressBar = localize({ en: "Download  –  " + px.projectName, de: "Download  –  " + px.projectName });
	ui.progressBarOpenTemplate = localize({ en: "Import Data", de: "Daten importieren" });
	ui.progressBarDownloadImages = localize({ en: "Download Images ", de: "Lade Bilder herunter" });

	if (px.showGUI) {
		var retval = getConfig();
	}
	else {
		var retval = px.debugPost;
	}

	if (retval == null) {
		log.info("User canceled");
		return;
	}

	var postObject = retval.postObject;
	var downloadImages = retval.downloadImages;
	var localImageFolder = retval.localImageFolder;
	var blogURL = retval.blogURL;

	blogURL = fixBlogUrlWordpressCom(blogURL);

	log.info("Verarbeite Post mit ID " + postObject.id + " titel " + postObject.blogTitle + " mode downloadImages: " + downloadImages + " folder " + localImageFolder);

	var request = {
		url: blogURL,
		command: "posts/" + postObject.id,
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
		return;
	}

	if (singlePost.hasOwnProperty("code")) {
		log.warn("Es konnte kein Beitrag heruntergeladen werden:\nCode: " + singlePost.code + " Message: " + singlePost.message);
		return;
	}

	if (singlePost.length == 0) {
		log.warn("Der Beitrag mit der ID [" + postObject.id + "] konnte nicht heruntergeladen werden!");
		return;
	}


	try {
		var pBar = new $.ProgressBar(ui.progressBar, 350, 100);
		pBar.show(ui.progressBarOpenTemplate + " %1 / " + 4, 4, 0);

		// HTML zusammebauen 
		var content = '<html><head><title>' + postObject.id + '</title>'
		if (singlePost.acf != undefined) {
			for (prop in singlePost.acf) {
				content += '<meta name="' + prop + '" content="' + singlePost.acf[prop] + '"></acf>';
			}
		}
		content += '</head><body>'


		// Featured Image einbinden
		if (singlePost.featured_media != 0 && singlePost.featured_media != undefined) {
			log.info("Post has featured media with media ID " + singlePost.featured_media);
			var request = {
				url: blogURL,
				command: "media/" + singlePost.featured_media,
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
				log.info("Bild [featuredImage] konnte nicht geladen werden:\nCode: " + featuredImage.code + " Message: " + featuredImage.message);
			}
			else {
				content += '<div id="featuredImage">' + featuredImage.source_url + '</div>'
			}

		}
		content += '<div id="content"><h1 class="title">' + postObject.blogTitle + '</h1>\r' + singlePost.content.rendered + '</div>'
		content += '</body></html>';
		pBar.hit(1);


		var xmlTempFile = File(Folder.temp + "/" + new Date().getTime() + Math.random().toString().replace(/\./, '') + "result.html");
		writeTextFile(xmlTempFile, content);

		xmlTempFile = runTidy(xmlTempFile);
		pBar.hit(2);


		// Load Template we checked existense of file already in checkDok()	
		var templateFile = getTemplateFile();
		try {
			templateDok = app.open(templateFile, px.debug, OpenOptions.OPEN_COPY);
		}
		catch (e) {
			log.warn(localize(ui.couldNotOpenTemplate, templateFile.name));
			log.warn(e);
			return;
		}
		// Remove Existing XML
		templateDok.xmlElements[0].contents = "";
		pBar.hit(3);

		// Set Import Preferences 
		with (templateDok.xmlImportPreferences) {
			allowTransform = true;
			transformFilename = File(getScriptFolderPath() + "/lib/wp2id_import.xsl");
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

		pBar.hit(4);

		templateDok.importXML(xmlTempFile);

		var root = templateDok.xmlElements[0];
		var postXML = root.xmlElements.itemByName("post");
		if (!postXML.isValid) {
			log.warn("No XML Data in post!");
			return;
		}

		var startPage = templateDok.pages[-1]; //.add({appliedMaster:mspread});
		var contentFrame = startPage.textFrames.add();
		contentFrame.placeXML(postXML);

		var placeGunArray = [];

		pBar.hit(2);

		// Bilder platzieren 
		var imgArray = postXML.evaluateXPathExpression("//*[@src]");
		if (imgArray.length > 0) {
			pBar.reset(ui.progressBarDownloadImages + " %1 / " + imgArray.length, imgArray.length, 0);


			if (downloadImages) {
				// Bilder herunterladen 
				var linkPath = Folder(dok.fullName.parent + "/Links");
				linkPath.create();
				if (!linkPath.exists) {
					log.warn("Could not find or create Folder [Links] used Desktop to download links instead!");
					linkPath = Folder.desktop;
				}
			}

			for (var i = 0; i < imgArray.length; i++) {
				pBar.hit(i + 1);
				var imgXML = imgArray[i];
				if (imgXML.xmlAttributes.itemByName("ostyle").isValid) {
					var oStyleName = imgXML.xmlAttributes.itemByName("ostyle").value;
					var oStyle = templateDok.objectStyles.itemByName(oStyleName);
					if (!oStyle.isValid) {
						log.warn("Create Objectstyle [" + oStyleName + "]")
						oStyle = templateDok.objectStyles.add({ name: oStyleName });
					}
				}
				else if (imgXML.markupTag.name != "featuredImage") {
					// Use markup tag for object style			
					log.info("Element " + imgXML.markupTag.name + " has now Attribute ostyle, we use the tag name!");
					var oStyleName = imgXML.markupTag.name;
					var oStyle = templateDok.objectStyles.itemByName(oStyleName);
					if (!oStyle.isValid) {
						log.warn("Create Objectstyle [" + oStyleName + "]")
						oStyle = templateDok.objectStyles.add({ name: oStyleName });
					}
				}

				var fileURL = imgXML.xmlAttributes.itemByName("src").value;
				var fileName = fileURL.split("/").pop();
				fileName = decodeURI(fileName);

				// Delete wrong HFS diacritics https://mathiasbynens.be/notes/javascript-unicode#accounting-for-lookalikes
				var regexSymbolWithCombiningMarks = /((?:[\0-\u02FF\u0370-\u0482\u048A-\u0590\u05BE\u05C0\u05C3\u05C6\u05C8-\u060F\u061B-\u064A\u0660-\u066F\u0671-\u06D5\u06DD\u06DE\u06E5\u06E6\u06E9\u06EE-\u0710\u0712-\u072F\u074B-\u07A5\u07B1-\u07EA\u07F4-\u0815\u081A\u0824\u0828\u082E-\u0858\u085C-\u08D3\u08E2\u0904-\u0939\u093D\u0950\u0958-\u0961\u0964-\u0980\u0984-\u09BB\u09BD\u09C5\u09C6\u09C9\u09CA\u09CE-\u09D6\u09D8-\u09E1\u09E4-\u0A00\u0A04-\u0A3B\u0A3D\u0A43-\u0A46\u0A49\u0A4A\u0A4E-\u0A50\u0A52-\u0A6F\u0A72-\u0A74\u0A76-\u0A80\u0A84-\u0ABB\u0ABD\u0AC6\u0ACA\u0ACE-\u0AE1\u0AE4-\u0AF9\u0B00\u0B04-\u0B3B\u0B3D\u0B45\u0B46\u0B49\u0B4A\u0B4E-\u0B55\u0B58-\u0B61\u0B64-\u0B81\u0B83-\u0BBD\u0BC3-\u0BC5\u0BC9\u0BCE-\u0BD6\u0BD8-\u0BFF\u0C04-\u0C3D\u0C45\u0C49\u0C4E-\u0C54\u0C57-\u0C61\u0C64-\u0C80\u0C84-\u0CBB\u0CBD\u0CC5\u0CC9\u0CCE-\u0CD4\u0CD7-\u0CE1\u0CE4-\u0CFF\u0D04-\u0D3A\u0D3D\u0D45\u0D49\u0D4E-\u0D56\u0D58-\u0D61\u0D64-\u0D81\u0D84-\u0DC9\u0DCB-\u0DCE\u0DD5\u0DD7\u0DE0-\u0DF1\u0DF4-\u0E30\u0E32\u0E33\u0E3B-\u0E46\u0E4F-\u0EB0\u0EB2\u0EB3\u0EBA\u0EBD-\u0EC7\u0ECE-\u0F17\u0F1A-\u0F34\u0F36\u0F38\u0F3A-\u0F3D\u0F40-\u0F70\u0F85\u0F88-\u0F8C\u0F98\u0FBD-\u0FC5\u0FC7-\u102A\u103F-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u1090-\u1099\u109E-\u135C\u1360-\u1711\u1715-\u1731\u1735-\u1751\u1754-\u1771\u1774-\u17B3\u17D4-\u17DC\u17DE-\u180A\u180E-\u1884\u1887-\u18A8\u18AA-\u191F\u192C-\u192F\u193C-\u1A16\u1A1C-\u1A54\u1A5F\u1A7D\u1A7E\u1A80-\u1AAF\u1ABF-\u1AFF\u1B05-\u1B33\u1B45-\u1B6A\u1B74-\u1B7F\u1B83-\u1BA0\u1BAE-\u1BE5\u1BF4-\u1C23\u1C38-\u1CCF\u1CD3\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1CFA-\u1DBF\u1DFA\u1E00-\u20CF\u20F1-\u2CEE\u2CF2-\u2D7E\u2D80-\u2DDF\u2E00-\u3029\u3030-\u3098\u309B-\uA66E\uA673\uA67E-\uA69D\uA6A0-\uA6EF\uA6F2-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA828-\uA87F\uA882-\uA8B3\uA8C6-\uA8DF\uA8F2-\uA925\uA92E-\uA946\uA954-\uA97F\uA984-\uA9B2\uA9C1-\uA9E4\uA9E6-\uAA28\uAA37-\uAA42\uAA44-\uAA4B\uAA4E-\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2-\uAAEA\uAAF0-\uAAF4\uAAF7-\uABE2\uABEB\uABEE-\uD7FF\uE000-\uFB1D\uFB1F-\uFDFF\uFE10-\uFE1F\uFE30-\uFFFF]|\uD800[\uDC00-\uDDFC\uDDFE-\uDEDF\uDEE1-\uDF75\uDF7B-\uDFFF]|[\uD801\uD803\uD808-\uD819\uD81C-\uD82E\uD830-\uD833\uD835\uD837\uD839\uD83B-\uDB3F\uDB41-\uDBFF][\uDC00-\uDFFF]|[\uD802\uD806][\uDC00-\uDE00\uDE04\uDE07-\uDE0B\uDE10-\uDE37\uDE3B-\uDE3E\uDE40-\uDEE4\uDEE7-\uDFFF]|\uD804[\uDC03-\uDC37\uDC47-\uDC7E\uDC83-\uDCAF\uDCBB-\uDCFF\uDD03-\uDD26\uDD35-\uDD72\uDD74-\uDD7F\uDD83-\uDDB2\uDDC1-\uDDC9\uDDCD-\uDE2B\uDE38-\uDE3D\uDE3F-\uDEDE\uDEEB-\uDEFF\uDF04-\uDF3B\uDF3D\uDF45\uDF46\uDF49\uDF4A\uDF4E-\uDF56\uDF58-\uDF61\uDF64\uDF65\uDF6D-\uDF6F\uDF75-\uDFFF]|\uD805[\uDC00-\uDC34\uDC47-\uDCAF\uDCC4-\uDDAE\uDDB6\uDDB7\uDDC1-\uDDDB\uDDDE-\uDE2F\uDE41-\uDEAA\uDEB8-\uDF1C\uDF2C-\uDFFF]|\uD807[\uDC00-\uDC2E\uDC37\uDC40-\uDC91\uDCA8\uDCB7-\uDD30\uDD37-\uDD39\uDD3B\uDD3E\uDD46\uDD48-\uDFFF]|\uD81A[\uDC00-\uDEEF\uDEF5-\uDF2F\uDF37-\uDFFF]|\uD81B[\uDC00-\uDF50\uDF7F-\uDF8E\uDF93-\uDFFF]|\uD82F[\uDC00-\uDC9C\uDC9F-\uDFFF]|\uD834[\uDC00-\uDD64\uDD6A-\uDD6C\uDD73-\uDD7A\uDD83\uDD84\uDD8C-\uDDA9\uDDAE-\uDE41\uDE45-\uDFFF]|\uD836[\uDC00-\uDDFF\uDE37-\uDE3A\uDE6D-\uDE74\uDE76-\uDE83\uDE85-\uDE9A\uDEA0\uDEB0-\uDFFF]|\uD838[\uDC07\uDC19\uDC1A\uDC22\uDC25\uDC2B-\uDFFF]|\uD83A[\uDC00-\uDCCF\uDCD7-\uDD43\uDD4B-\uDFFF]|\uDB40[\uDC00-\uDCFF\uDDF0-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]))((?:[\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08D4-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AFA-\u0AFF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C00-\u0C03\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0D00-\u0D03\u0D3B\u0D3C\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D82\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u180B-\u180D\u1885\u1886\u18A9\u1920-\u192B\u1930-\u193B\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F\u1AB0-\u1ABE\u1B00-\u1B04\u1B34-\u1B44\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BF3\u1C24-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF2-\u1CF4\u1CF7-\u1CF9\u1DC0-\u1DF9\u1DFB-\u1DFF\u20D0-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA66F-\uA672\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA880\uA881\uA8B4-\uA8C5\uA8E0-\uA8F1\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9E5\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F]|\uD800[\uDDFD\uDEE0\uDF76-\uDF7A]|\uD802[\uDE01-\uDE03\uDE05\uDE06\uDE0C-\uDE0F\uDE38-\uDE3A\uDE3F\uDEE5\uDEE6]|\uD804[\uDC00-\uDC02\uDC38-\uDC46\uDC7F-\uDC82\uDCB0-\uDCBA\uDD00-\uDD02\uDD27-\uDD34\uDD73\uDD80-\uDD82\uDDB3-\uDDC0\uDDCA-\uDDCC\uDE2C-\uDE37\uDE3E\uDEDF-\uDEEA\uDF00-\uDF03\uDF3C\uDF3E-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF57\uDF62\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC35-\uDC46\uDCB0-\uDCC3\uDDAF-\uDDB5\uDDB8-\uDDC0\uDDDC\uDDDD\uDE30-\uDE40\uDEAB-\uDEB7\uDF1D-\uDF2B]|\uD806[\uDE01-\uDE0A\uDE33-\uDE39\uDE3B-\uDE3E\uDE47\uDE51-\uDE5B\uDE8A-\uDE99]|\uD807[\uDC2F-\uDC36\uDC38-\uDC3F\uDC92-\uDCA7\uDCA9-\uDCB6\uDD31-\uDD36\uDD3A\uDD3C\uDD3D\uDD3F-\uDD45\uDD47]|\uD81A[\uDEF0-\uDEF4\uDF30-\uDF36]|\uD81B[\uDF51-\uDF7E\uDF8F-\uDF92]|\uD82F[\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD838[\uDC00-\uDC06\uDC08-\uDC18\uDC1B-\uDC21\uDC23\uDC24\uDC26-\uDC2A]|\uD83A[\uDCD0-\uDCD6\uDD44-\uDD4A]|\uDB40[\uDD00-\uDDEF])+)/g;
				fileName = fileName.replace(regexSymbolWithCombiningMarks, '$1');

				if (downloadImages) {
					log.info("Download image from URL " + fileURL);
					var imageFile = File(linkPath + "/" + fileName);

					var request = {
						url: fileURL.toString()
					}

					var response = restix.fetchFile(request, imageFile);
					try {
						if (response.error) {
							throw Error("Error while download image [" + fileName + "]\nfrom URL [" + fileURL + "]\nto local file [" + imageFile + "]\n\n" + response.errorMsg);
						}
					}
					catch (e) {
						log.warn(e);
					}
				}
				else {
					var imageFile = File(localImageFolder + "/" + fileName);
					log.info("Link to local folder " + imageFile);
				}

				// Check for 404 Images
				if (imageFile.exists && imageFile.length < 10000) {
					var canOpen = imageFile.open("r");
					if (canOpen) {
						var contents = imageFile.read();
						if (contents.match(/<body class="error404">/)) {
							log.warn("Found an 404 Image: [" + fileURL + "]");
							imageFile.remove();
						}
					}
				}


				if (imageFile.exists && imageFile.length > 0) {

					var rect;
					if (imgXML.markupTag.name == "featuredImage") {
						placeGunArray.push(imageFile);
					}
					else {
						rect = templateDok.rectangles.add();
						rect.geometricBounds = [0, 0, 50, 100]; // Default if not set in Object style
						rect.appliedObjectStyle = oStyle;
						try {
							rect.place(imageFile);
						}
						catch (e) {
							log.warn("Cannot place " + imageFile.name + "\nError: " + e);
						}

						if (rect.getElements()[0] instanceof TextFrame) {
							log.warn("Found text instead of image data for [" + fileURL + "]");
						}

						rect.fit(FitOptions.PROPORTIONALLY);
						rect.fit(FitOptions.FRAME_TO_CONTENT);
						rect.anchoredObjectSettings.insertAnchoredObject(imgXML.xmlContent.insertionPoints[0]);
						rect.anchoredObjectSettings.properties = rect.appliedObjectStyle.anchoredObjectSettings.properties;

						// TODO fix image height > textFrame height


					}
				}
				else {
					log.warn("Could not donwload/find image URL [" + fileURL + "]");
				}
			}
		}

		var story = contentFrame.parentStory;

		// Fix whitespace at beginning of parageraph
		app.findGrepPreferences = NothingEnum.NOTHING;
		app.changeGrepPreferences = NothingEnum.NOTHING;
		app.findGrepPreferences.findWhat = "^ +";
		story.changeGrep();

		// Fix forced Line break at end of paragraph
		app.findGrepPreferences = NothingEnum.NOTHING;
		app.changeGrepPreferences = NothingEnum.NOTHING;
		app.findGrepPreferences.findWhat = "\\n(?=\\r)";
		story.changeGrep();

		// Kill Last white space.
		app.findGrepPreferences = NothingEnum.NOTHING;
		app.changeGrepPreferences = NothingEnum.NOTHING;
		app.findGrepPreferences.findWhat = "\\s+\\Z";
		try {
			story.changeGrep();
		}
		catch(e) {
			log.info("Could not run '\\s+\\Z' GREP . InDesign CC 2020 Bug?");
		}

		idsTools.untag(root);


		// Export to TEMP ICML
		var tempICMLFile = File(Folder.temp + "/" + new Date().getTime() + Math.random().toString().replace(/\./, '') + "temp.icml");
		story.exportFile(ExportFormat.INCOPY_MARKUP, tempICMLFile);
		placeGunArray.unshift(tempICMLFile);

		// Need to set the user, for import 
		if (app.userName == "Unbekannter Benutzername") {
			app.userName = "press2ID";
		}

		try {
			dok.placeGuns.loadPlaceGun(placeGunArray);
		}
		catch (e) {
			// // Windows Async File Export Problems (Error: Die Datei existiert nicht bzw. wird von einer anderen Anwendung verwendet, oder Sie haben nicht die entsprechenden Zugriffsrechte.)
			if (e.number == 29446) {
				for (var i = 0; i < placeGunArray.length; i++) {
					if (!placeGunArray[i].exists) throw e;
				}
			}
			else {
				throw e;
			}
		}
		dok.links[placeGunArray.length * -1].unlink();
		tempICMLFile.remove();
	}
	catch (e) {
		throw e;
	}
	finally {
		// Clean up 	
		if (px.debug) {
			xmlTempFile.parent.execute();
		}
		else {
			try {
				templateDok.close(SaveOptions.NO);
			}
			catch (e) {
				log.info("Errro while cleanup")
				log.info(e);
			}
			try {
				xmlTempFile.remove();
			}
			catch (e) {
				log.info("Errro while cleanup")
				log.info(e);
			}
			try {
				pBar.close();
			}
			catch (e) {
				log.info("Errro while cleanup")
				log.info(e);
			}
		}
	}
}


/**** Functions with detailed functionality */
/* Choose Post and Configuration (UI) */
function getConfig() {

	var ui = {}
	ui.winTitle = { en: "Import settings", de: "Importeinstellungen" };

	ui.panelBlogInfo = { en: "Web address of the blog", de: "Webadresse des Blogs" };
	ui.buttonBlogInfoFetch = { en: "Fetch", de: "Abrufen" };
	ui.buttonBlogInfoFetchonClickURLWrong = { en: "URL must start with http:// or https://", de: "URL muss mit http:// oder https:// beginnen" };

	ui.panelSelectPost = { en: "Select the post", de: "Wählen Sie den Beitrag" };
	ui.panelSelectPostFilter = localize({ en: "[Search in title]", de: "[Im Titel suchen]" });


	ui.panelImageManagement = { en: "Image processing", de: "Bilder verarbeiten" };
	ui.radioImageManagementDownload = { en: "Download from Blog", de: "Vom Blog herunterladen" };
	ui.radioImageManagementLocalFolder = { en: "Link from local folder", de: "Aus lokalem Ordner verknüpfen" };
	ui.edittextImageManagementFolderStandardText = { en: "[Select folder ...]", de: "[Ordner wählen ...]" };
	ui.buttonImageManagementFolderSelect = { en: "Choose", de: "Wählen" };
	ui.buttonImageManagementFolderSelectOnClick = { en: "Select the folder", de: "Wählen Sie den Ordner aus" };
	ui.wrongReturnValue = { en: "Something went wrong, could not find Post based on the ID", de: "Etwas ist schiefgelaufen, konnte den Beitrag anhand der ID nicht finden" };

	ui.buttonStartOk = { en: "Place", de: "Platzieren" };
	ui.buttonStartCancel = { en: "Cancel", de: "Abbrechen" };

	var listBounds = [0, 0, 400, 250];
	var panelMargins = [10, 15, 10, 10];

	// Try to fetch default blog or last used blog
	var savedBlogAdress = app.extractLabel("wp2id:blogURL");
	var blogURL = (savedBlogAdress == "") ? px.blogURL : savedBlogAdress;
	var saveBlogURL = false;

	var listItems = [];
	listItems = getListOfBlogEntries(blogURL, 1, false);

	var win = new Window('dialog {text: "' + localize(ui.winTitle) + '  –  ' + px.projectName + ' ' + px.version + '", alignChildren: "fill"}');

	// Panel Blog URL 
	var panelBlogInfo = win.add('panel {text:"' + localize(ui.panelBlogInfo) + '", margins:[' + panelMargins + '], alignChildren:["left", "top"]}');
	var groupBlogInfo = panelBlogInfo.add('group');
	var edittextBlogInfoURL = groupBlogInfo.add('edittext {text: "' + blogURL + '", preferredSize:[310, -1]}');
	edittextBlogInfoURL.onChange = function () {
		if (blogURL == edittextBlogInfoURL.text) {
			return;
		}
		buttonBlogInfoFetch.onClick();
	}
	var buttonBlogInfoFetch = groupBlogInfo.add('button {text:"' + localize(ui.buttonBlogInfoFetch) + '", preferredSize:[80,-1]}');
	buttonBlogInfoFetch.onClick = function () {
		blogURL = edittextBlogInfoURL.text;
		edittextSelectPost.text = "";
		if (!blogURL.match(/^https?:\/\//)) {
			log.infoAlert(localize(ui.buttonBlogInfoFetchonClickURLWrong));
			return;
		}
		log.info("buttonBlogInfoFetch.onClick");
		listItems = getListOfBlogEntries(blogURL, 1, true);

		saveBlogURL = (listItems.length > 0);
		fillListboxSelectPost();
	}

	// Panel Select Post 
	var panelSelectPost = win.add('panel {alignChildren: "fill", text: "' + localize(ui.panelSelectPost) + '", margins:[' + panelMargins + ']}');
	var edittextSelectPost = panelSelectPost.add('edittext { text: "' + ui.panelSelectPostFilter + '"}');
	edittextSelectPost.onActivate = function () {
		if (edittextSelectPost.text == ui.panelSelectPostFilter) {
			edittextSelectPost.text = "";
		}
	}
	edittextSelectPost.onChanging = function () {
		fillListboxSelectPost();
	}

	var groupSelectPost = panelSelectPost.add('group');
	var listboxSelectPost = groupSelectPost.add('listbox {bounds:[' + listBounds + ']}');

	// Panel Image Management 	
	var panelImageManagement = win.add("panel {text:'" + localize(ui.panelImageManagement) + "', margins:[" + panelMargins + "], alignChildren:['left', 'top']}");
	var groupImageManagementRadioSelect = panelImageManagement.add("group {spacing:5, alignChildren:['left', 'top'], orientation:'column'}");
	var radioImageManagementDownload = groupImageManagementRadioSelect.add("radiobutton {text:'" + localize(ui.radioImageManagementDownload) + "', value:true}");
	var radioImageManagementLocalFolder = groupImageManagementRadioSelect.add("radiobutton {text:'" + localize(ui.radioImageManagementLocalFolder) + "'}");
	radioImageManagementDownload.onClick = radioImageManagementLocalFolder.onClick = function () {
		if (radioImageManagementLocalFolder.value && edittextImageManagementFolder.imageFolder == undefined) {
			chooseFolder();
		}
		buttonStartOk.enabled = canRun();
	}
	var groupImageManagementFolderSelect = panelImageManagement.add("group {margins:[0,-10,0,0]}");
	var edittextImageManagementFolder = groupImageManagementFolderSelect.add('edittext', undefined, 'Read only', { readonly: true }); // readonly does not work with resource string method
	edittextImageManagementFolder.text = localize(ui.edittextImageManagementFolderStandardText);
	edittextImageManagementFolder.preferredSize = [310, -1];

	var buttonImageManagementFolderSelect = groupImageManagementFolderSelect.add('button {text:"' + localize(ui.buttonImageManagementFolderSelect) + '", preferredSize:[80,-1]}');
	buttonImageManagementFolderSelect.onClick = function () {
		chooseFolder();
	}
	function chooseFolder() {
		try {
			var inddFolder = app.activeDocument.fullName.parent;
			var res = inddFolder.selectDlg(localize(ui.buttonImageManagementFolderSelectOnClick));
		}
		catch (e) {
			var res = Folder.selectDialog(localize(ui.buttonImageManagementFolderSelectOnClick));
		}

		if (res != null) {
			edittextImageManagementFolder.imageFolder = res;
			edittextImageManagementFolder.helpTip = res.toString();
			edittextImageManagementFolder.text = (res.parent) ? ".../" + res.parent.name : "";
			if (res.parent && res.parent == "~") edittextImageManagementFolder.text = res.parent;
			edittextImageManagementFolder.text += "/" + res.name; //fsName.toString().substring(0,2000);
		}
		else {
			edittextImageManagementFolder.text = localize(ui.edittextImageManagementFolderStandardText);
			edittextImageManagementFolder.helpTip = "";
			edittextImageManagementFolder.imageFolder = undefined;
		}
		buttonStartOk.enabled = canRun();
	}

	// Group for Ok/Cancel
	var groupStart = win.add("group {preferredSize:[400,undefined], alignChildren:['right', 'center'], margins: [0,0,0,0]}");
	var buttonStartOk = groupStart.add("button {name: 'ok', text:'" + localize(ui.buttonStartOk) + "', enabled:false}  ");
	buttonStartOk.onClick = function () {
		win.close(1);
	}
	var buttonStartCancel = groupStart.add("button {text:'" + localize(ui.buttonStartCancel) + "'}  ");
	buttonStartCancel.onClick = function () {
		win.close(2);
	}



	// Globale helper 
	// Replace the Listbox with posts 
	function fillListboxSelectPost() {
		var tempMatcher = edittextSelectPost.text.toLowerCase();
		var tempArray = [];
		for (var i = 0; i < listItems.length; i++) {
			if ((listItems[i].blogTitle + "").toLowerCase().match(tempMatcher)) {
				tempArray.push(listItems[i].blogTitle + " [" + listItems[i].id + "]");
			}
		}

		// Create the new list with the same bounds as the one it will replace
		tempList = groupSelectPost.add("listbox", listBounds, tempArray, { scrolling: true });
		tempList.onChange = function () {
			buttonStartOk.enabled = canRun();
		}
		tempList.onDoubleClick = function (e) {
			if (canRun()) win.close(1);
		}

		groupSelectPost.remove(listboxSelectPost);
		listboxSelectPost = tempList;

		if (tempArray.length > 0) {
			listboxSelectPost.selection = 0;
		}
		buttonStartOk.enabled = canRun();
	}

	// Check if we have all necessary  information
	function canRun() {
		groupImageManagementFolderSelect.enabled = radioImageManagementLocalFolder.value;
		if (listboxSelectPost.selection == null) return false;
		if (radioImageManagementLocalFolder.value && edittextImageManagementFolder.imageFolder == undefined) return false;
		return true;
	}

	// Init
	fillListboxSelectPost();
	// Show Windows and process results
	if (win.show() != 2) {
		if (saveBlogURL) {
			app.insertLabel("wp2id:blogURL", blogURL);
		}
		if (canRun()) {
			var pxObject = null;
			for (var p = 0; p < listItems.length; p++) {
				if (listboxSelectPost.selection.toString().indexOf(listItems[p].blogTitle + " [" + listItems[p].id + "]") == 0) {
					return {
						postObject: listItems[p],
						downloadImages: radioImageManagementDownload.value,
						localImageFolder: edittextImageManagementFolder.imageFolder,
						blogURL: blogURL
					};
				}
			}
			log.warn(localize(ui.wrongReturnValue));
		}
		else {
			return null;
		}
	}
	return null;

}

/**
 * Fetch Blog Posts 
 * @param {*} blogURL 
 * @param {*} page Results are paginated by 100 Entries, if page > 1 and no entries are found an empty array [] is returned
 * @param {*} verbose 
 */
function getListOfBlogEntries(blogURL, page, verbose) {
	var ui = {};
	ui.noBlogPostsOnSite = { en: "No Blog entries on [%1]", de: "Keine Beiträge/Posts auf [%1]" };
	var fixedURL = fixBlogUrlWordpressCom(blogURL);
	page = 100;
	var action = "posts/?per_page=100&page=" + page + "&context=embed";

	log.info("getListOfBlogEntries: " + fixedURL + action + " mode verbose " + verbose);

	var request = {
		url: fixedURL,
		command: action,
	}
	var response = restix.fetch(request);
	try {
		if (response.error) {
			throw Error(response.errorMsg);
		}
		var postEmbed = JSON.parse(response.body);
	}
	catch (e) {
		var msg = "Could not connect to\n" + blogURL + "\n\n" + e;
		if (verbose) {
			log.infoAlert(msg);
		}
		else {
			log.info(msg);
		}

		log.info(e);
		return [];
	}

	if (postEmbed.hasOwnProperty("code")) {
		if (postEmbed.code == "rest_post_invalid_page_number" && page > 1) {
			var msg = "Ende der Paginierung auf Seite [" + page + "]. Es konnte kein Beitrag heruntergeladen werden:\nCode: " + postEmbed.code + " Message: " + postEmbed.message;
		}
		else {
			var msg = "Es konnte kein Beitrag heruntergeladen werden:\nCode: " + postEmbed.code + " Message: " + postEmbed.message;
		}
		if (verbose) {
			log.infoAlert(msg);
		}
		else {

			log.info(msg);
		}
		return [];
	}


	var listItems = [];
	for (var i = 0; i < postEmbed.length; i++) {
		listItems[i] = { id: postEmbed[i].id, blogTitle: Encoder.htmlDecode(postEmbed[i].title.rendered) };
	}
	log.info("listItems.length " + listItems.length + " response.httpStatus " + response.httpStatus);
	if (verbose && postEmbed.length == 0 && response.httpStatus == 200) {
		log.infoAlert(localize(ui.noBlogPostsOnSite, blogURL));
	}
	return listItems;
}

/* Search Template File */
function getTemplateFile() {
	var scriptFolderPath = getScriptFolderPath();
	var templatePath = Folder(scriptFolderPath + "/templates")
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


function fixBlogUrlWordpressCom(blogURL) {
	if (blogURL.match(/\.wordpress.com.$/)) return "https://public-api.wordpress.com/wp/v2/sites/" + blogURL.replace(/^https?:\/\//, '').replace(/\/$/, "") + "/";
	else return blogURL.replace(/\/$/, "") + "/wp-json/wp/v2/";
}


/* HTML Tidy aufrufen */
function runTidy(xmlTempFile) {
	try {
		var cmd = "";
		var systemCmd = "";
		var timeOut = 0;
		var processResultFile = File(Folder.temp + "/" + new Date().getTime() + Math.random().toString().replace(/\./, '') + "result.txt");
		var libPath = Folder(getScriptFolderPath() + "/lib");


		if ($.os.indexOf("Windows") > -1) {
			var tidyBinPath = '"' + libPath.fsName + '/tidy-win/tidy.exe"';
			var tidyConfigPath = '"' + libPath.fsName + '/tidyconfig.txt"';
			var tidyErrorPath = '"' + libPath.parent.fsName + '/log/tidyError.txt"';
			cmd = [
				tidyBinPath + ' -config ' + tidyConfigPath + ' -f ' + tidyErrorPath + ' -m ' + xmlTempFile.fsName,
				'echo Exit Code is %errorlevel% > "' + processResultFile.fsName + '"'
			].join("\n");

			systemScriptFile = File(Folder.temp + "/" + new Date().getTime() + Math.random().toString().replace(/\./, '') + "system.bat");
			writeTextFileLocal(systemScriptFile, cmd, "UTF-8", "WINDOWS");

			systemCmd = "Set WshShell = CreateObject(\"WScript.Shell\")\r";
			systemCmd += "WshShell.Run chr(34) & \"" + systemScriptFile.fsName + "\" & Chr(34), 0\r";
			systemCmd += "Set WshShell = Nothing\r";
			systemCmd += "\r";
			app.doScript(systemCmd, ScriptLanguage.VISUAL_BASIC);
		}
		else { // Mac
			var tidyBinPath = '"' + libPath.fsName + '/tidy-mac/tidy"';
			systemCmd = 'do shell script "chmod u+x \'' + libPath.fsName + '/tidy-mac/tidy' + '\'"';
			app.doScript(systemCmd, ScriptLanguage.APPLESCRIPT_LANGUAGE);

			var tidyConfigPath = '"' + libPath.fsName + '/tidyconfig.txt"';
			var tidyErrorPath = '"' + libPath.parent.fsName + '/log/tidyError.txt"';

			cmd = [
				'#!/bin/bash',
				tidyBinPath + ' -config ' + tidyConfigPath + ' -f ' + tidyErrorPath + ' -m ' + xmlTempFile.fsName,
				'echo $? >> "' + processResultFile.fsName + '"',
				'echo 0',
			].join("\n");

			systemScriptFile = File(Folder.temp + "/" + new Date().getTime() + Math.random().toString().replace(/\./, '') + "system.sh");
			writeTextFileLocal(systemScriptFile, cmd, "UTF-8", "UNIX");

			//~ 			We dont need +x because of call with bash ...
			//~ 			systemCmd = 'do shell script "chmod u+x \'' +systemScriptFile.fsName + '\'"';
			//~ 			app.doScript(systemCmd, ScriptLanguage.APPLESCRIPT_LANGUAGE);						

			systemCmd = 'do shell script "bash \'' + systemScriptFile.fsName + '\'"';
			app.doScript(systemCmd, ScriptLanguage.APPLESCRIPT_LANGUAGE);

		}

		timeoutFileExistence(processResultFile, 60);

		if (!processResultFile.exists) {
			throw Error("Could not execute System Script!");
		}
		processResultFile.open("r");
		var resultString = processResultFile.readln();
		processResultFile.close();
		processResultFile.remove();

		log.info("Transform result: " + resultString);
		//~ 		if (resultString.indexOf ("java version") == 0) {
		//~ 			return true;
		//~ 		} else {
		//~ 			log.info("Java Test Result: " +  resultString);
		//~ 			return false;
		//~ 		}
	}
	catch (e) {
		throw e;
	}
	finally {
		// Clean up
		if (processResultFile && processResultFile.exists) processResultFile.remove();
		if (systemScriptFile && systemScriptFile.exists) systemScriptFile.remove();
		return xmlTempFile;
	}
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
/**  Init Log File and System */
function initLog() {
	var scriptFolderPath = getScriptFolderPath();
	if (scriptFolderPath.fullName.match(/lib$/)) {
		scriptFolderPath = scriptFolderPath.parent;
	}

	var logFolder = Folder(scriptFolderPath + "/log/");
	logFolder.create();
	var logFile = File(logFolder + "/" + px.projectName + "_log.txt");

	if (px.debug) {
		log = idsLog.getLogger(logFile, "DEBUG", true);
		log.clearLog();
	}
	else {
		log = idsLog.getLogger(logFile, "INFO", false);
	}
	log.info("Starte " + px.projectName + " v " + px.version + " Debug: " + px.debug + " ScriptPrefVersion: " + app.scriptPreferences.version + " InDesign v " + app.version);
	return logFile;
}

/** Get Filepath from current script  */
/*Folder*/ function getScriptFolderPath() {
	var skriptPath;
	try {
		$.level = 0;
		skriptPath = app.activeScript.parent;
	}
	catch (e) {
		/* We're running from the ESTK*/
		$.level = 2;
		skriptPath = File(e.fileName).parent;
	}
	return skriptPath;
}
