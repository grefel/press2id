# press2id
Connect Adobe InDesign to a WordPress Blog via REST
- Works with *Adobe InDesign* CS 6 and higher
- Connects to any *WordPress* 4.7 or higher

Detailed infos about the script is found at [publishing.blog [DE]](https://publishing.blog/press2id) and [publishing.blog ACF [DE]](https://publishing.blog/WordPress-nach-indesign-press2id-jetzt-mit-custom-fields-und-custom-post-types/) by @haemeulrich and [creative-aktuell.de [DE]](https://www.creative-aktuell.de/de/blog-details/indesign-WordPress-artikel-weiterverarbeiten.html) by @einmanncombo

# Table of contents
* [Install information](#install)
* [Quick start guide](#quick-start-guide)
* [Workflow](#some-notes-on-the-workflow)
* [Deutsche Anleitung](#wie-geht-das)

## Install
Copy the contents of the folder `Scripts Panel` to your InDesign **Scripts Panel**.

![Scripts Panel](https://raw.githubusercontent.com/grefel/press2id/master/Documentation/assets/scriptsPanel.png)

* [How to install a script](https://indesignsecrets.com/how-to-install-scripts-in-indesign.php)
* [Skripte in InDesign installieren](https://www.publishingx.de/skripte-installieren/) 

For a simple start, use the file `press2id_PlaceGun.idml` from the `Example Files` folder.

## Quick start guide 
The script places WordPress posts in the active Document. See details in the [german how to](#Wie geht das?)
1. Start the script and enter a WordPress blog URL.
2. Select your processing mode. For a first start ***Place Gun Mode*** fits well.
   ![Place  Gun Mode](https://raw.githubusercontent.com/grefel/press2id/master/Documentation/assets/placeGunMode.png)
3. Select a post and press ***Start*** -> The script loads the post content an images in the place gun.
4. Change styles according to your needs (you can do this also before placing)

### Technical details of the script
* REST Access with [restix](https://github.com/grefel/restix)
* Preprocessing with XSLT (InDesign XSLT Processor -> only 1.0)
* JavaScript/Extendscript for postprocessing.
* Import is template based. The scirpt uses an InDesign file in folder **templates**  for basic styling. HTML element names are mapped to InDesign styles by element names. Change any style here.
* Loads the Post content and featured image into the place gun.
* You can link to local image files with the same name.

## Wie geht das?
* Nach der [Installation](https://www.publishingx.de/skripte-installieren/) sollte das Bedienfeld **Skripte** den gesamten Skriptordner anzeigen. Wichtig ist erstmal nur das eigentliche Skript `press2id.jsx`. 

  ![Scripts Panel](https://raw.githubusercontent.com/grefel/press2id/master/Documentation/assets/scriptsPanel.png)

* Bevor du loslegen kannst, brauchst du ein geöffnetes Dokument. Das kann ganz leer sein. Wichtig ist nur, dass es gespeichert ist. Der Speicherort ist notwendig, da *press2id* die Bider im Ordner Links neben dem Dokument speichert. Alternativ kannst du auch das CC 2020 Dokument `press2id_example.indd` (CC 2020) aus dem Ordner `Example Files` verwenden. Hier sind dann alle Schriften aus dem danebenliegenden Ordner `Document Fonts` aktiviert.
* Starte jetzt das Skript mit einem Doppelklick auf `press2id.jsx`. Das Fenster mit den Einstellungen erscheint.

  ![Importeinstellungen](https://raw.githubusercontent.com/grefel/press2id/master/Documentation/assets/gui.png)

* Du kannst deinen eigenen WordPress-Blog eintragen oder erstmal einen Artikel von meinem [Blog](https://www.indesignblog.com/) verwenden z.B. den Beitrag [	
XML suchen und Text hinzufügen
](https://www.indesignblog.com/2017/05/xml-suchen-und-text-hinzufuegen/).

  ![Screenshot](https://raw.githubusercontent.com/grefel/press2id/master/Documentation/assets/blog.png)

* Mit dem Datumsfilter kannst du die Auswahl der Beiträge eingrenzen. Wenn du ihn unverändert lässt, werden alle Beiträge des Blogs angezeigt.

### Einen Beitrag platzieren 
* Wähle einen Beitrag aus der Liste aus und drücke auf **Platzieren**. 
* *press2id* lädt nun den Inhalt und die Bilder herunter und lädt Sie in die PlaceGun des Mauszeigers. Die benötigten Formate werden automatisch erstellt.  Nach dem Platzieren sieht das Ergebnis so aus:

  ![InDesign Import](https://raw.githubusercontent.com/grefel/press2id/master/Documentation/assets/result.png)

* Für die Formatierung der Texte werden Absatz- und Zeichenformate entsprechend den Namen der HTML-Elemente verwendet. Ein ganz normaler Absatz `<p>` wird entsprechend in InDesign mit dem Absatzformat `p` ausgezeichnet. Die Bilder `<img>` werden wiederum mit dem Objektformat `img` ausgezeichnet. 

### Mehrere Beiträge platzieren
* Wenn du mehr als einen Beitrag platzieren willst, benötigst du eine Musterseite mit dem Namen ***W-WordPress***.
![Masterspread](https://raw.githubusercontent.com/grefel/press2id/master/Documentation/assets/masterSpread.png)

* Auf der Musterseite W-WordPress müssen benannte Rahmen für den Inhalt und das Beitragsbild (Featured Image) erstellt werden. Namen für Rahmen können im Bedienfeld *Ebenen* zugewiesen werden. Für den Beitragsinhalt erstelle einen Textrahmen mit dem Namen ***content*** für das Beitragsbild einen Rechteckrahmen mit dem Namen ***featured-image***
![Named Frames](https://raw.githubusercontent.com/grefel/press2id/master/Documentation/assets/namedFrames.png)
Im Dokument `press2id_example.indd` ist das schon erledigt!

* Wähle nun die gewünschten Beiträg aus der Liste aus und drücke auf **Platzieren**. 
* Das Skript setze jeden Beitrag auf eine Seite und befüllt die benannten Rahmen mit dem Inhalt. Wenn er länger als eine Seite ist, löst es den Textüberlauf auf. Für die Formatierung gelten die gleichen Regeln wie für einzelne Beiträge.

### Das Layout anpassen
* Du kannst nun einfach die Formate nach deinen Wünschen anpassen. 
* Wenn die Formate bereits **vor** dem Platzieren existieren, werden die Werte aus den Formaten erstellt. Du kannst dir so einfach eine Vorlage bauen und die Standardformate von *press2id* überschreiben. Das ist auch der empfohlene Weg für Layoutanpassungen!
* Die Formate kommen übrigens aus der Datei `wordrepss_basic.idml`, die im Ordner `templates` neben dem Skript liegt. Diese kannst du natürlich auch anpassen oder austauschen. Allerdings musst du dann bei einem Update aufpassen, dass deine Datei nicht überschrieben wird. Wenn du ein neues Template für dein individuelles Layout anlegen möchtest, kann es jedoch sinnvoll sein die Formate aus dieser Datei zu laden. 
