# press2id
Connect Adobe InDesign to a Wordpress Blog via REST
- Works with *Adobe InDesign* CS 6 and higher
- Connects to any *Wordpress* 4.7 or higher

# Table of contents
* [Install information](#install)
* [Workflow](#some-notes-on-the-workflow)
* [Deutsche Anleitung](#wie-geht-das)



## Install
Copy the contents of the folder **Scripts Panel** to your InDesign **Scripts Panel**

![Scripts Panel](https://raw.githubusercontent.com/grefel/press2id/master/docu/assets/scriptsPanel.png)

* [How to install a script](https://indesignsecrets.com/how-to-install-scripts-in-indesign.php)
* [Skripte in InDesign installieren](https://www.publishingx.de/skripte-installieren/) 

## Some notes on the Workflow 
The script places Worpress posts in the active Document. See details in the [german how to](#Wie geht das?)
1. Start the script and enter a Blog URL.
2. Select a post.
3. The script loads the post content an images in the place gun. 
4. Change styles according to your needs (you can do this also before placing)

### Technical details of the script
* REST Access with [restix](https://github.com/grefel/restix)
* Based on XHTML cleaned by [HTML Tidy](http://www.html-tidy.org/)
* Preprocessing with XSLT (InDesign XSLT Processor -> only 1.0)
* JavaScript/Extendscript for postprocessing.
* Import is template based. The scirpt uses an InDesign file in folder **templates**  for basic styling. HTML element names are mapped to InDesign styles by element names. Change any style here.
* Loads the Post content and featured image into the place gun.
* You can link to local image files with the same name.

## Wie geht das?
* Nach der [Installation](https://www.publishingx.de/skripte-installieren/) sollte das Bedienfeld **Skripte** den gesamten Skriptordner anzeigen. Wichtig ist erstmal nur das eigentliche Skript `press2id.jsx`. 
  ![Scripts Panel](https://raw.githubusercontent.com/grefel/press2id/master/docu/assets/scriptsPanel.png)

* Bevor du loslegen kannst, brauchst du ein geöffnetes Dokument. Das kann ganz leer sein. Wichtig ist nur, dass es gespeichert ist. Der Speicherort ist notwendig, da *press2id* die Bider im Ordner Links neben dem Dokument speichert.
* Starte jetzt das Skript mit einem Doppelklick auf `press2id.jsx`. Das Fenster mit den Einstellungen erscheint.

![Importeinstellungen](https://raw.githubusercontent.com/grefel/press2id/master/docu/assets/gui.png)

* DU kannst deinen eigenen Wordpress-Blog eintragen oder erstmal einen Artikel von meinem [Blog](https://www.indesignblog.com/) verwenden z.B. den Beitrag [	
XML suchen und Text hinzufügen
](https://www.indesignblog.com/2017/05/xml-suchen-und-text-hinzufuegen/).

![Screenshot](https://raw.githubusercontent.com/grefel/press2id/master/docu/assets/blog.png)

* Nach der Auswahl einen Artikels drücke auf **Platzieren**. 
* *press2id* lädt nun den Inhalt und die Bilder herunter und lädt Sie in die PlaceGun. Die benötigten Formate werden automatisch erstellt.  Nach dem Platzieren sieht das Ergebnis so aus:

![InDesign Import](https://raw.githubusercontent.com/grefel/press2id/master/docu/assets/result.png)

* Für die Formatierung der Texte werden Absatz- und Zeichenformate entsprechend den Namen der HTML-Elemente verwendet. Ein ganz normaler Absatz `<p>` wird entsprechend in InDesign mit dem Absatzformat `p` ausgezeichnet. Die Bilder `<img>` werden wiederum mit dem Objektformat `img` ausgezeichnet. 

![Formate](https://raw.githubusercontent.com/grefel/press2id/master/docu/assets/styles.png) 

### Das Layout anpassen
* Du kannst nun einfach die Formate nach deinen Wünschen anpassen. 
* Wenn die Formate bereits **vor** dem Platzieren existieren, werden die Werte aus den Formaten erstellt. Du kannst dir so einfach eine Vorlage bauen und die Standardformate von *press2id* überschreiben. Das ist auch der empfohlene Weg für Layoutanpassungen!
* Die Formate kommen übrigens aus der Datei `wordrepss_basic.idml`, die im Ordner `templates` neben dem Skript liegt. Diese kannst du natürlich auch anpassen oder austauschen. Allerdings musst du dann bei einem Update aufpassen, dass deine Datei nicht überschrieben wird. 

