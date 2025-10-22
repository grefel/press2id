tl;dr – I just want the script: [press2id-latest.zip](https://raw.githubusercontent.com/grefel/press2id/master/release/press2id-latest.zip).

# press2id
Connect Adobe InDesign to a WordPress Blog
* Works with *Adobe InDesign* CS 6 and higher
* Connects to any *WordPress* 4.7 or higher

Detailed information is found at [publishing.blog [DE]](https://publishing.blog/press2id) and [publishing.blog ACF [DE]](https://publishing.blog/WordPress-nach-indesign-press2id-jetzt-mit-custom-fields-und-custom-post-types/) by @haemeulrich

press2id is successfully used with the following publications. If you also use it and want to be added to this list, just send a message!
#### Fill Place Gun Mode
* https://www.azur-online.de
* https://dievolkswirtschaft.ch/de/
#### Fill Masterspread Mode
* https://www.jakobmaser.com/blog/skript/online-skript-projektmanagement-planning-und-konzeption/
#### Fill Data Fields Mode
  * https://parktheater-iserlohn.de/
  * https://biasiada.de/

# Table of contents
* [Download and Install](#download-and-install)
* [Quick start guide](#quick-start-guide)
* [Retrieve drafts and Authentication](#authentication)
* [Technical notes on the Workflow](#technical-details-of-the-script)

## Download and Install
1. Download the current version [press2id-latest.zip](https://raw.githubusercontent.com/grefel/press2id/master/release/press2id-latest.zip).
1. Unzip the archive.
1. Copy the contents of the folder `Scripts Panel` to your InDesign **Scripts Panel**. <br/> <img src="https://raw.githubusercontent.com/grefel/press2id/master/doc/assets/scriptsPanel.png" width="250" alt="Scripts Panel">

If you never installed a script, help is here:

* [How to install a script](https://indesignsecrets.com/how-to-install-scripts-in-indesign.php)
* [Skripte in InDesign installieren](https://www.publishingx.de/skripte-installieren/) 

## Quick start guide 
The script places WordPress posts in the active Document. See details in the [german how to](#Wie geht das?)
1. For a simple start open a new document or use the file `press2id_PlaceGun.idml` from the `examples` folder.
1. Start the script and enter a WordPress blog URL. Unsure which, just enter `https://www.indesignblog.com/` <br/> <img src="https://raw.githubusercontent.com/grefel/press2id/master/doc/assets/enterURL.png" width="500" alt="Enter URL">
1. Press ***Next***
1. Select ***Fill Place Gun*** mode. <br/> <img src="https://raw.githubusercontent.com/grefel/press2id/master/doc/assets/placeGunMode.png" width="500" alt="Place Gun Mode">
1. Press ***Next***
4. Select a post and press ***Start*** <br/> <img src="https://raw.githubusercontent.com/grefel/press2id/master/doc/assets/selectAPost.png" width="500" alt="Select Post">
5. Press ***Start***
6. The script loads the post content and images in the place gun.
7. Change styles according to your needs (you can do this also before placing)

### Fill Masterspread Mode
If you want to add several Posts in document you can try the ***Fill Masterspread*** mode. 
1. The script uses the Masterspread `W-Wordpress` you can use the file `press2id_Masterspread.idml` from the `examples` folder.
1. Choose the mode  <br/> <img src="https://raw.githubusercontent.com/grefel/press2id/master/doc/assets/masterSpreadMode.png" width="500" alt="Fill Masterspread Mode">
2. Select several posts.

## Authentication
### Get drafts or other statuses that are not publicly available
Without authentication, the plugin can only retrieve posts with the status “published.” To retrieve unpublished posts e.g. drafts, you must specify a fixed WordPress URL. 

With a authentication enabled the filter posts view will get an extra `Status Filter` section: <br/> <img src="https://raw.githubusercontent.com/grefel/press2id/master/doc/assets/filter_status.jpg" width="500" alt="Filter posts">

### Configuration

Currently, authentication information can only be entered permanently in the script file. Please note that the WordPress access password will then be stored in plain text in the script file. <br/> <img src="https://raw.githubusercontent.com/grefel/press2id/master/doc/assets/authenticate.jpg" width="800" alt="Configure authentication">

1. In line 16, the URL of the blog must be entered in the `siteURL` property. The first selection screen will then be skipped.
2. In line 21, the `authenticate` property must be set to `true`.
3. In lines 22 and 23, user name and application password must be entered.

To get an application password go to the Edit User page of your WordPress Site. You can generate new, and view or revoke existing application passwords. <br/>
<img src="https://make.wordpress.org/core/files/2020/10/Screen-Shot-2020-10-21-at-12.32.37-PM.png" width="500" alt="Get an application password">

Note that you use your username in the property `user` and not the name of the application password! The complete technical background can be found here at the [WordPress Documentation](https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/)


## Technical details of the script
* InDesign is managed with [JavaScript](https://www.indesignjs.de/auflage2/).
* REST access with [restix](https://github.com/grefel/restix) to the [WordPress API](https://developer.wordpress.org/rest-api/)
* Post content needs to be XHTML and is processed via InDesign XML Import. 
* Styling is template based. The script uses the InDesign file `wordrepss_basic.idml` and a XSL-Transformation `wordrepss_basic.xsl` from the folder `templates`  for basic styling. HTML element names are mapped to InDesign styles by element names. Change any style definition here.
* Supported HTML
  * Block elements `h1`...`h6`, `p`, `quote` and some more
  * Lists `ul` and `ol`
  * Inline elements `b`, `i`, `em`, `strong`, `span`
  * Figures `figure`, `img` and `caption`
  * Hyperlinks `a`
* You can link to local image files with the same name.

## Wie geht das?
* Nach der [Installation](https://www.publishingx.de/skripte-installieren/) sollte das Bedienfeld **Skripte** den gesamten Skriptordner anzeigen. Wichtig ist erstmal nur das eigentliche Skript `press2id.jsx`. 

<img src="https://raw.githubusercontent.com/grefel/press2id/master/doc/assets/scriptsPanel.png" width="250" alt="Scripts Panel">

* Bevor du loslegen kannst, brauchst du ein geöffnetes Dokument. Das kann ganz leer sein. Wichtig ist nur, dass es gespeichert ist. Der Speicherort ist notwendig, da *press2id* die Bilder im Ordner Links neben dem Dokument speichert. Alternativ kannst du auch das CC 2020 Dokument `press2id_PlaceGun.idml` (CC 2020) aus dem Ordner `Example Files` verwenden. Hier sind dann alle Schriften aus dem danebenliegenden Ordner `Document Fonts` aktiviert.
* Starte jetzt das Skript mit einem Doppelklick auf `press2id.jsx`. Das Fenster mit den Einstellungen erscheint.

* Du kannst deinen eigenen WordPress-Blog eintragen oder erstmal einen Artikel von meinem [Blog](https://www.indesignblog.com/) verwenden z.B. den Beitrag [	
XML suchen und Text hinzufügen
](https://www.indesignblog.com/2017/05/xml-suchen-und-text-hinzufuegen/).

  ![Screenshot](https://raw.githubusercontent.com/grefel/press2id/master/doc/assets/blog.png)

* Mit dem Datumsfilter kannst du die Auswahl der Beiträge eingrenzen. Wenn du ihn unverändert lässt, werden alle Beiträge des Blogs angezeigt.

### Einen Beitrag platzieren 
* Wähle einen Beitrag aus der Liste aus und drücke auf **Platzieren**. 
* *press2id* lädt nun den Inhalt und die Bilder herunter und lädt sie in die PlaceGun des Mauszeigers. Die benötigten Formate werden automatisch erstellt.  Nach dem Platzieren sieht das Ergebnis so aus:

  ![InDesign Import](https://raw.githubusercontent.com/grefel/press2id/master/doc/assets/result.png)

* Für die Formatierung der Texte werden Absatz- und Zeichenformate entsprechend den Namen der HTML-Elemente verwendet. Ein ganz normaler Absatz `<p>` wird entsprechend in InDesign mit dem Absatzformat `p` ausgezeichnet. Die Bilder `<img>` werden wiederum mit dem Objektformat `img` ausgezeichnet. 

### Mehrere Beiträge platzieren
* Wenn du mehr als einen Beitrag platzieren willst, benötigst du eine Musterseite mit dem Namen ***W-WordPress***.
![Masterspread](https://raw.githubusercontent.com/grefel/press2id/master/doc/assets/masterSpread.png)

* Auf der Musterseite W-WordPress müssen benannte Rahmen für den Inhalt und das Beitragsbild (Featured Image) erstellt werden. Namen für Rahmen können im Bedienfeld *Ebenen* zugewiesen werden. Für den Beitragsinhalt erstelle einen Textrahmen mit dem Namen ***content*** für das Beitragsbild einen Rechteckrahmen mit dem Namen ***featured-image***
![Named Frames](https://raw.githubusercontent.com/grefel/press2id/master/doc/assets/namedFrames.png)
Im Dokument `press2id_example.indd` ist das schon erledigt!

* Wähle nun die gewünschten Beiträge aus der Liste aus und drücke auf **Platzieren**. 
* Das Skript setzt jeden Beitrag auf eine Seite und befüllt die benannten Rahmen mit dem Inhalt. Wenn er länger als eine Seite ist, löst es den Textüberlauf auf. Für die Formatierung gelten die gleichen Regeln wie für einzelne Beiträge.

### Das Layout anpassen
* Du kannst nun einfach die Formate nach deinen Wünschen anpassen. 
* Wenn die Formate bereits **vor** dem Platzieren existieren, werden die Werte aus den Formaten verwendet. Du kannst dir so einfach eine Vorlage bauen und die Standardformate von *press2id* überschreiben. Das ist auch der empfohlene Weg für Layoutanpassungen!
* Die Formate kommen übrigens aus der Datei `wordrepss_basic.idml`, die im Ordner `templates` neben dem Skript liegt. Diese kannst du natürlich auch anpassen oder austauschen. Allerdings musst du dann bei einem Update aufpassen, dass deine Datei nicht überschrieben wird. Wenn du ein neues Template für dein individuelles Layout anlegen möchtest, kann es jedoch sinnvoll sein die Formate aus dieser Datei zu laden. 
