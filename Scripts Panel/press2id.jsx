//DESCRIPTION:press2id – Place Post from Wordpress Blogs 
//Author: Gregor Fellenz - http://www.publishingx.de

#include lib/encoder.js
#include lib/json2.js
#include lib/idsLog.jsx
#include lib/idsTools2.jsx
#include lib/ProgressBar.jsx
#include lib/restix.jsx

var px = {
	projectName:"press2id",
	version:"2018-04-04-v1.0",
	
	blogURL:"https://www.indesignblog.com", 
//~ 	blogURL:"https://www.publishingx.de", 
//~ 	blogURL:"https://www.publishingblog.ch", 
//~ 	blogURL:"https://wordpress.org/news", 
	


	// Dokument muss gespeichert werden
	saveDocBeforeRun:true, 
	runWithUndo:true,
	
	// Verwaltung
	showGUI:true,
	debug:false
}

// Debug Stuff
if (app.extractLabel("px:debugID") == "Jp07qcLlW3aDHuCoNpBK_Gregor-") {
	app.insertLabel("wp2id:blogURL", px.blogURL);
	px.debugPost = {postObject:{id:12580, blogTitle:"Debug Run 12580" }, downloadImages:true, localImageFolder:Folder("/Users/hp/oc/publishingX/15-Auftraege/2018-02-26_Wordpress2ID/Links"), blogURL:px.blogURL};

	px.showGUI = false;
	px.debug = true;
}

main();

function main() {
	if  (app.documents.length == 0) {
		alert("Kein Dokument geöffnet", "Hinweis"); 
		return;
	}	
	if (app.layoutWindows.length == 0)  {
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
	

	if (px.debug) {
		dok = saveDocBeforeRun(dok);
		var oldVals = idsTools.resetDefaults(dok);			
		app.scriptPreferences.version = parseInt(app.version);
		log.info("processDok mit app.scriptPreferences.version " + app.scriptPreferences.version  + " app.version " + app.version);
		if (checkDok(dok)) {
			if (px.runWithUndo) {
				app.doScript(processDok, ScriptLanguage.JAVASCRIPT, [dok], UndoModes.ENTIRE_SCRIPT, px.projectName);
			}
			else {
				processDok(dok);
			}
		}	
		idsTools.setDefaults(dok, oldVals);
	}
	else {
		try {
			dok = saveDocBeforeRun(dok);
			var oldVals = idsTools.resetDefaults(dok);			
			
			if(dok && dok.isValid) {		
				
				app.scriptPreferences.userInteractionLevel = UserInteractionLevels.NEVER_INTERACT;
				app.scriptPreferences.enableRedraw = false;
				app.scriptPreferences.version = parseInt(app.version);
				log.info("processDok: app.scriptPreferences.version " + app.scriptPreferences.version  + " app.version " + app.version);
				
				if (checkDok(dok)) {					
					if (px.runWithUndo) {
						app.doScript(processDok, ScriptLanguage.JAVASCRIPT, [dok], UndoModes.ENTIRE_SCRIPT, px.projectName);
					}
					else {
						processDok(dok);
					}
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
	}

	if(log.getCounters().warn > 0) {
		log.showWarnings();
	}
//~ 	else {
//~ 		log.infoAlert("Fertig");
//~ 	}
}


function saveDocBeforeRun(dok) {
	if (!px.debug && px.saveDocBeforeRun && (!dok.saved || dok.modified)) {
		if ( log.confirm ("Das Dokument muss zuerst gespeichert werden!\rSpeichern und fortfahren?", undefined, "Dokument ist nicht gespeichert")) {
			 try {
				app.scriptPreferences.userInteractionLevel = UserInteractionLevels.INTERACT_WITH_ALL;
				dok = dok.save();
			 } catch (e) {
				log.warn ("Die Datei konnte nicht gespeichert werden.\n" + e);
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
	ui.noTemplate = {en:"Could not find a template file in folder [templates] next to the script.", de:"Es konnte keine Vorlagendatei im Ordner [templates] neben dem Skript gefunden werden."};
	
	var templateFile = getTemplateFile();
	if (templateFile == null) {
		log.warn(localize(ui.noTemplate));
		return false;
	}
	
	return true;
}

function processDok(dok) {
	var ui = {}
	ui.couldNotOpenTemplate  = {en:"Could not open Template %1", de:"Konnte Template %1 nicht öffnen."};
	ui.progressBar = localize({en:"Download  –  "+ px.projectName, de:"Download  –  "+ px.projectName});
	ui.progressBarOpenTemplate = localize({en:"Import Data", de:"Daten importieren"});
	ui.progressBarDownloadImages = localize({en:"Download Images ", de:"Lade Bilder herunter"});
	
	if (px.runWithUndo) {
		dok = dok[0]; 
	}

	if (px.showGUI ) {
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
	
	log.info("Verarbeite Post mit ID " + postObject.id + " titel " + postObject.blogTitle + " mode downloadImages: " + downloadImages + " folder " + localImageFolder);
	
	var request = {
		url:blogURL,
		command:"wp-json/wp/v2/posts/" + postObject.id, 
	}
	var response = restix.fetch(request);
	try {
		if (response.error ) {
			throw Error (response.errorMsg);
		}		
		var singlePost = JSON.parse(response.body);		
	}
	catch (e) {				
		log.warn(e)
		return;
	}

	if (singlePost.length == 0) {
		log.warn("Der Beitrag mit der ID [" + postObject.id + "] konnte nicht heruntergeladen werden!");
		return;
	}	

	try {
		var pBar = new $.ProgressBar(ui.progressBar, 350, 100);
		pBar.show(ui.progressBarOpenTemplate +  " %1 / " + 4, 4, 0);  

		// HTML zusammebauen 
		var content = '<html><head><title>' + postObject.id + '</title></head><body>'
		// Featured Image einbinden
		if (singlePost.featured_media != 0) {			
			var request = {
				url:blogURL,
				command:"wp-json/wp/v2/media/" + singlePost.featured_media, 
			}
			var response = restix.fetch(request);
			try {
				if (response.error ) {
					throw Error (response.errorMsg);
				}		
				var featuredImage = JSON.parse(response.body);		
			}
			catch (e) {				
				log.warn(e)
				return;
			}		

			content += '<div id="featuredImage">'  + featuredImage.guid.rendered + '</div>'
		}
		content += '<div id="content"><h1 class="title">'  + postObject.blogTitle + '</h1>\r' +  singlePost.content.rendered +  '</div>'
		content += '</body></html>';
		pBar.hit(1);


		var xmlTempFile = File (Folder.temp + "/" + new Date().getTime() + Math.random().toString().replace(/\./, '') + "result.html" );		
		writeTextFile (xmlTempFile, content);
		
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
			transformFilename =  File (getScriptFolderPath() + "/lib/wp2id_import.xsl");
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
			pBar.reset(ui.progressBarDownloadImages +  " %1 / " + imgArray.length, imgArray.length, 0);
			
			
			if (downloadImages) {
				// Bilder herunterladen 
				var linkPath = Folder (dok.fullName.parent + "/Links");
				linkPath.create();
				if (!linkPath.exists) {
					log.warn("Could not find or create Folder [Links] used Desktop to download links instead!");
					linkPath = Folder.desktop;
				}
			}
			
			for (var i = 0; i < imgArray.length; i++) {
				pBar.hit(i+1);
				var imgXML = imgArray[i];
				var oStyleName = imgXML.xmlAttributes.itemByName("ostyle").value;
				var oStyle = templateDok.objectStyles.itemByName(oStyleName);
				if (!oStyle.isValid) {
					log.warn("Create Objectstyle [" +oStyleName  + "]")
					oStyle = templateDok.objetStyles.add({name:oStyleName});
				}
				var fileURL = imgXML.xmlAttributes.itemByName("src").value;
				var fileName = fileURL.split("/").pop();
				if (downloadImages) {
					log.info("Download image from URL " + fileURL);
					var imageFile = File (linkPath + "/" +fileName);
					
					var request = {
						url:fileURL.toString()
					}
					var response = restix.fetchFile(request, imageFile);
					try {
						if (response.error ) {
							throw Error (response.errorMsg);
						}
					}
					catch (e) {				
						log.warn(e)
						return;
					}					
				}
				else {
					var imageFile = File (localImageFolder + "/" +fileName);
					log.info("Link to local folder " + imageFile);				
				}

				if (imageFile.exists && imageFile.length > 0) {
					var rect;
					if (imgXML.markupTag.name == "featuredImage") {
						placeGunArray.push(imageFile);
						// loadToPlaceGun ();
//~ 					if (imgXML.pageItems.length != 0) {
//~ 						rect = imgXML.pageItems[0].getElements()[0];
//~ 						rect.place(imageFile);
//~ 						rect.fit(FitOptions.FILL_PROPORTIONALLY);
//~ 						rect.appliedObjectStyle = oStyle;						
//~ 					}
//~ 					else {
//~ 						log.warn("There ist no featured image Frame tagged, but a featured image [" + fileURL +"]. Please add a tagged Frame in your template.");
//~ 					}
					}
					else {
						rect = templateDok.rectangles.add();
						rect.geometricBounds = [0,0,50,100]; // Default if not set in Object style
						rect.appliedObjectStyle = oStyle;
						rect.place(imageFile);
						rect.fit(FitOptions.PROPORTIONALLY);
						rect.fit(FitOptions.FRAME_TO_CONTENT);
						rect.anchoredObjectSettings.insertAnchoredObject(imgXML.xmlContent.insertionPoints[0]);
						rect.anchoredObjectSettings.properties = rect.appliedObjectStyle.anchoredObjectSettings.properties;
						
						// TODO fix image height > textFrame height
					}
					if (rect && rect.getElements()[0] instanceof TextFrame) {
						log.warn("Found text instead of image data for [" + fileURL +"]");
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
		story.changeGrep();
		
		idsTools.untag(root);
		
		
		// Export to TEMP ICML
		var tempICMLFile = File (Folder.temp + "/" + new Date().getTime() + Math.random().toString().replace(/\./, '') + "temp.icml" );
		story.exportFile(ExportFormat.INCOPY_MARKUP, tempICMLFile);		
		placeGunArray.unshift(tempICMLFile);
		
		// Need to set the user, for import 
		if (app.userName == "Unbekannter Benutzername" ) {
			app.userName = "press2ID";
		}
		
		try {
			dok.placeGuns.loadPlaceGun(placeGunArray);			
		}
		catch (e) {
			// // Windows Async File Export Problems (Error: Die Datei existiert nicht bzw. wird von einer anderen Anwendung verwendet, oder Sie haben nicht die entsprechenden Zugriffsrechte.)
			if (e.number == 29446) {
				for (var i = 0; i < placeGunArray.length ; i++ ) {
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
	ui.winTitle = {en:"Import settings", de:"Importeinstellungen"};
	
	ui.panelBlogInfo = {en:"Web address of the blog", de:"Webadresse des Blogs"};
	ui.buttonBlogInfoFetch = {en:"Fetch", de:"Abrufen"};
	ui.buttonBlogInfoFetchonClickURLWrong = {en:"URL must start with http:// or https://", de:"URL muss mit http:// oder https:// beginnen"};
	
	ui.panelSelectPost = {en:"Select the post", de:"Wählen Sie den Beitrag"};
	ui.panelSelectPostFilter = localize ( {en:"[Search in title]", de:"[Im Titel suchen]"} );

 	
	ui.panelImageManagement = {en:"Image processing", de:"Bilder verarbeiten"};
	ui.radioImageManagementDownload = {en:"Download from Blog", de:"Vom Blog herunterladen"};
	ui.radioImageManagementLocalFolder = {en:"Link from local folder", de:"Aus lokalem Ordner verknüpfen"};
	ui.edittextImageManagementFolderStandardText = {en:"[Select folder ...]", de:"[Ordner wählen ...]"};
	ui.buttonImageManagementFolderSelect = {en:"Choose", de:"Wählen"};
	ui.buttonImageManagementFolderSelectOnClick = {en:"Select the folder", de:"Wählen Sie den Ordner aus"};
	ui.wrongReturnValue = {en:"Something went wrong, could not find Post based on the ID", de:"Etwas ist schiefgelaufen, konnte den Beitrag anhand der ID nicht finden"};

	ui.buttonStartOk = {en:"Place", de:"Platzieren"};
	ui.buttonStartCancel = {en:"Cancel", de:"Abbrechen"};

	var listBounds = [0, 0, 400, 250];
	var panelMargins = [10,15,10,10];

	// Try to fetch default blog or last used blog
	var savedBlogAdress = app.extractLabel("wp2id:blogURL");
	var blogURL = (savedBlogAdress == "") ? px.blogURL : savedBlogAdress;
	var saveBlogURL = false;
	
	var listItems = [];
	listItems = getListOfBlogEntries(blogURL , false);
	
	var win = new Window ('dialog {text: "' + localize(ui.winTitle) + '  –  ' +px.projectName + ' ' +  px.version + '", alignChildren: "fill"}');	
	
	// Panel Blog URL 
	var panelBlogInfo = win.add ('panel {text:"' + localize(ui.panelBlogInfo) + '", margins:[' + panelMargins +'], alignChildren:["left", "top"]}');
	var groupBlogInfo = panelBlogInfo.add('group');
	var edittextBlogInfoURL = groupBlogInfo.add ('edittext {text: "' + blogURL + '", preferredSize:[310, -1]}');				 
		edittextBlogInfoURL.onChange = function () {
			if (blogURL == edittextBlogInfoURL.text && listItems.length > 0) {				
				return;
			}
			buttonBlogInfoFetch.onClick();
		}
	var buttonBlogInfoFetch = groupBlogInfo.add('button {text:"' + localize(ui.buttonBlogInfoFetch) + '", preferredSize:[80,-1]}');	
		buttonBlogInfoFetch.onClick = function () {
			blogURL = edittextBlogInfoURL.text;
			edittextSelectPost.text = "";
			if (!blogURL.match(/^https?:\/\//)) {
				log.infoAlert(localize(ui.buttonBlogInfoFetchonClickURLWrong) );
				return;
			}
			listItems = getListOfBlogEntries(blogURL , true);
			
			saveBlogURL = (listItems.length > 0);
			fillListboxSelectPost();
		}

	// Panel Select Post 
	var panelSelectPost = win.add ('panel {alignChildren: "fill", text: "' + localize(ui.panelSelectPost) + '", margins:[' + panelMargins +']}');	
	var edittextSelectPost = panelSelectPost.add ('edittext { text: "' + ui.panelSelectPostFilter + '"}');
		edittextSelectPost.onActivate = function () {
			if (edittextSelectPost.text == ui.panelSelectPostFilter) {
				edittextSelectPost.text = "";
			}
		}
		edittextSelectPost.onChanging = function () {
			fillListboxSelectPost();
		}
	
	var groupSelectPost = panelSelectPost.add ('group');
	var listboxSelectPost = groupSelectPost.add ('listbox {bounds:[' + listBounds + ']}');
	
	// Panel Image Management 	
	var panelImageManagement = win.add( "panel {text:'" + localize(ui.panelImageManagement)+ "', margins:[" + panelMargins +"], alignChildren:['left', 'top']}");
	var groupImageManagementRadioSelect = panelImageManagement.add( "group {spacing:5, alignChildren:['left', 'top'], orientation:'column'}");
	var radioImageManagementDownload = groupImageManagementRadioSelect.add("radiobutton {text:'" + localize(ui.radioImageManagementDownload)+ "', value:true}");	
	var radioImageManagementLocalFolder = groupImageManagementRadioSelect.add("radiobutton {text:'" + localize(ui.radioImageManagementLocalFolder)+ "'}");
		radioImageManagementDownload.onClick = radioImageManagementLocalFolder.onClick = function() {
			if (radioImageManagementLocalFolder.value && edittextImageManagementFolder.imageFolder == undefined) {
				chooseFolder();
			}
			buttonStartOk.enabled = canRun();
		}
	var groupImageManagementFolderSelect = panelImageManagement.add( "group {margins:[0,-10,0,0]}");
	var edittextImageManagementFolder = groupImageManagementFolderSelect.add ('edittext', undefined, 'Read only', {readonly: true}); // readonly does not work with resource string method
	edittextImageManagementFolder.text = localize(ui.edittextImageManagementFolderStandardText);
	edittextImageManagementFolder.preferredSize = [310,-1];
	
	var buttonImageManagementFolderSelect = groupImageManagementFolderSelect.add('button {text:"' + localize(ui.buttonImageManagementFolderSelect) + '", preferredSize:[80,-1]}');	
		buttonImageManagementFolderSelect.onClick = function(){
			chooseFolder();
		}	
		function chooseFolder() {
			try {
				var inddFolder = app.activeDocument.fullName.parent;
				var  res  = inddFolder.selectDlg(localize(ui.buttonImageManagementFolderSelectOnClick));
			}
			catch (e) {
				var  res  = Folder.selectDialog(localize(ui.buttonImageManagementFolderSelectOnClick));
			}
			
			if (res != null) {
				edittextImageManagementFolder.imageFolder = res;
				edittextImageManagementFolder.helpTip = res.toString();
				edittextImageManagementFolder.text = (res.parent) ? ".../" + res.parent.name : "";
				if (res.parent && res.parent == "~" ) edittextImageManagementFolder.text = res.parent;
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
	var buttonStartOk = groupStart.add( "button {name: 'ok', text:'" + localize(ui.buttonStartOk) + "', enabled:false}  " );
		buttonStartOk.onClick = function() {
			win.close(1);
		}
	var buttonStartCancel = groupStart.add( "button {text:'" + localize(ui.buttonStartCancel) + "'}  " );
		buttonStartCancel.onClick = function() {
			win.close (2);
		}
	
	

	// Globale helper 
	// Replace the Listbox with posts 
	function fillListboxSelectPost() {
		var tempMatcher = edittextSelectPost.text.toLowerCase();
		var  tempArray = [];
		for (var i = 0; i < listItems.length; i++) {
			if ((listItems[i].blogTitle + "").toLowerCase().match (tempMatcher) )  {
				tempArray.push (listItems[i].blogTitle + " [" +  listItems[i].id + "]");
			}
		}
	
		// Create the new list with the same bounds as the one it will replace
		tempList = groupSelectPost.add ("listbox", listBounds, tempArray, {scrolling: true});
		tempList.onChange = function () {
			buttonStartOk.enabled = canRun();
		}
		tempList.onDoubleClick = function (e) {
			if ( canRun() ) win.close(1);
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
	if (win.show () != 2) {
		if (saveBlogURL) {
			app.insertLabel("wp2id:blogURL", blogURL);
		}
		if (canRun()) {
			var pxObject = null;
			for (var p = 0; p < listItems.length; p++) {
				if (listboxSelectPost.selection.toString().indexOf(listItems[p].blogTitle + " [" +  listItems[p].id + "]") == 0) {
					return {
						postObject : listItems[p], 
						downloadImages : radioImageManagementDownload.value, 
						localImageFolder : edittextImageManagementFolder.imageFolder,
						blogURL:blogURL
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

/* Fetch Blog Posts */
function getListOfBlogEntries(blogURL, verbose) {
	log.info("getListOfBlogEntries: " + blogURL +  "/wp-json/wp/v2/posts/?per_page=100&context=embed");

	var request = {
		url:blogURL,
		command:"/wp-json/wp/v2/posts/?per_page=100&context=embed", 
	}
	var response = restix.fetch(request);
	try {
		if (response.error ) {
			throw Error (response.errorMsg);
		}		
		var postEmbed = JSON.parse(response.body);		
	}
	catch (e) {				
		var msg = "Could not connect to\n"+blogURL+"";
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
		var msg = "Es konnte kein Beitrag heruntergeladen werden:\nCode: " + postEmbed.code + " Message: " + postEmbed.message;
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
		listItems[i] = {id:postEmbed[i].id, blogTitle:Encoder.htmlDecode(postEmbed[i].title.rendered)};
	}
	if (verbose && postEmbed.length == 0 && resultObject.statusCode == 200) {
		log.infoAlert("Keine Beiträge/Posts auf " + blogURL + " vorhanden!");
	}
	return listItems;
}

/* Search Template File */
function getTemplateFile() {
	var scriptFolderPath = getScriptFolderPath();
	var templatePath = Folder ( scriptFolderPath + "/templates")
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

/* Bookmarks und Metadaten einfügen */
function runTidy (xmlTempFile) {	
	try {
		var cmd = "";
		var systemCmd = "";
		var timeOut = 0;		
		var processResultFile= File (Folder.temp + "/" + new Date().getTime() + Math.random().toString().replace(/\./, '') + "result.txt" );
		var libPath = Folder(getScriptFolderPath() + "/lib");


		if ($.os.indexOf ("Windows") > -1) {
			var tidyBinPath = '"' + libPath.fsName + '/tidy-win/tidy.exe"';
			var tidyConfigPath = '"' + libPath.fsName + '/tidyconfig.txt"';
			var tidyErrorPath = '"' + libPath.parent.fsName + '/log/tidyError.txt"';
			cmd = [
				tidyBinPath + ' -config ' + tidyConfigPath + ' -f ' + tidyErrorPath +  ' -m ' + xmlTempFile.fsName ,
				'echo Exit Code is %errorlevel% > "' + processResultFile.fsName + '"'
			].join("\n");
			
			systemScriptFile = File (Folder.temp + "/" + new Date().getTime() + Math.random().toString().replace(/\./, '') + "system.bat" );
			writeTextFileLocal (systemScriptFile, cmd, "UTF-8", "WINDOWS");
						
			systemCmd = "Set WshShell = CreateObject(\"WScript.Shell\")\r";  
			systemCmd += "WshShell.Run chr(34) & \"" + systemScriptFile.fsName+ "\" & Chr(34), 0\r";  
			systemCmd += "Set WshShell = Nothing\r";
			systemCmd += "\r";
			app.doScript(systemCmd, ScriptLanguage.VISUAL_BASIC);			
		}
		else { // Mac
			var tidyBinPath = '"' + libPath.fsName + '/tidy-mac/tidy"';
			var tidyConfigPath = '"' + libPath.fsName + '/tidyconfig.txt"';
			var tidyErrorPath = '"' + libPath.parent.fsName + '/log/tidyError.txt"';	
			
			cmd = [
			'#!/bin/bash',	
			tidyBinPath + ' -config ' + tidyConfigPath + ' -f ' + tidyErrorPath +  ' -m ' + xmlTempFile.fsName ,
			'echo $? >> "' + processResultFile.fsName + '"', 
			'echo 0',			
			].join("\n");
			

			systemScriptFile = File (Folder.temp + "/" + new Date().getTime() + Math.random().toString().replace(/\./, '') + "system.sh" );
			writeTextFileLocal (systemScriptFile, cmd, "UTF-8", "UNIX");
												
//~ 			systemScriptFile.parent.execute();
//~ 			exit();
																								
			systemCmd = 'do shell script "chmod u+x \'' +systemScriptFile.fsName + '\'"';
			app.doScript(systemCmd, ScriptLanguage.APPLESCRIPT_LANGUAGE);						
			
			systemCmd = 'do shell script "bash \'' +systemScriptFile.fsName + '\'"';
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
		$.sleep (1000); // 1 Sekunde
		timeOut++;
	} 
	log.info("System call successful. Run time " + timeOut + " seconds")
	$.sleep (500);

	if (!processResultFile.exists) {
		throw Error("Timeout. Result file " + processResultFile.name + " does not appear after " + seconds + " seonds run time.\nMight be a slow server connection?");
	}
}
/* Erstellen von Textdateien mit korrektem Linefeed für Bash oder Bat Skripte relevant */
function writeTextFileLocal (file, string, encoding, linefeed) {	
	if (file.constructor.name == "String") {
		file = new File(file);
	}
	if (file.constructor.name == "File") {
		try {
			if (linefeed != undefined) {
				file.lineFeed = linefeed;
			}
			file.open("a");
			file.write(string);
			file.close();
			return true;
		} catch (e) {return e}
	} 
	else {
		return Error ("This is not a File");
	}
}
function writeTextFile (file, string, encoding) {
	if (encoding == undefined) {
		encoding = "UTF-8";
	}
	if (file.constructor.name == "String") {
		file = new File(file);
	}
	if (file.constructor.name == "File") {
		try {
			file.encoding = encoding;
			file.open( "w" );
			file.write (string);
			file.close ();
			return true;
		} catch (e) {
			return e;
		}
	} 
	else {
		return Error ("This is not a File");
	}
}
/**  Init Log File and System */
function initLog() {
	var scriptFolderPath = getScriptFolderPath();
	if (scriptFolderPath.fullName.match(/lib$/)) {
		scriptFolderPath = scriptFolderPath.parent;
	}

	var logFolder = Folder( scriptFolderPath + "/log/");
	logFolder.create();
	var logFile = File ( logFolder + "/" + px.projectName + "_log.txt" );

	if (px.debug) {
		log = idsLog.getLogger(logFile, "DEBUG", true);
		log.clearLog();
	} 
	else {
		log = idsLog.getLogger(logFile, "INFO", false);
	}
	log.info("Starte " + px.projectName + " v " + px.version + " Debug: " + px.debug + " ScriptPrefVersion: " + app.scriptPreferences.version + " InDesign v " + app.version );
	return logFile;
}

/** Get Filepath from current script  */
/*Folder*/ function getScriptFolderPath() {
	var skriptPath;
	try {
		skriptPath  = app.activeScript.parent;
	} 
	catch (e) { 
		/* We're running from the ESTK*/
		skriptPath = File(e.fileName).parent;
	}
	return skriptPath;
}

