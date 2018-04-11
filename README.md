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
The script will place an Worpress post in the active Document. See details in the [german how to](#Wie geht das?)
* Start the script and enter a Blog URL
* REST Access with [restix](https://github.com/grefel/restix)
* Based on XHTML cleaned by [HTML Tidy](http://www.html-tidy.org/)
* XSLT (InDesign Processor, 1.0)
* JavaScript/Extendscript 
* Template based: Uses an InDesign File in folder **templates**  for basic styling. Change any style here
* Loads the Post content and featured image into the place gun.
* You can link to local image files with the same name.

## Wie geht das?
* Nach der [Installation](https://www.publishingx.de/skripte-installieren/) sollte das Bedienfeld Skript das Skript, die Hilfsprogramme und die Template-Datei beinhalten: 

![Scripts Panel](https://raw.githubusercontent.com/grefel/press2id/master/docu/assets/scriptsPanel.png)

* Starte das Skript mit einem Doppelklick auf **press2id.jsx**. Das Fenster mit den Einstellungen erscheint.

![Importeinstellungen](https://raw.githubusercontent.com/grefel/press2id/master/docu/assets/gui.png)

* Hier kannst du deinen eigenen Wordpress-Blog eintragen. Oder erstmal einen Artikel von meinem [Blog](https://www.indesignblog.com/) verwenden z.B. den Beitrag [	
XML suchen und Text hinzufügen
](https://www.indesignblog.com/2017/05/xml-suchen-und-text-hinzufuegen/).

![Screenshot](https://raw.githubusercontent.com/grefel/press2id/master/docu/assets/blog.png)

* Nach der Auswahl einen Artikels drücke auf **Platzieren**. 
* *press2id* lädt nun den Inhalt und die Bilder herunter und lädt Sie in die PlaceGun. Nach dem Platzieren sieht das Ergebnis so aus:

![InDesign Import](https://raw.githubusercontent.com/grefel/press2id/master/docu/assets/result.png)

* Das Layout basiert auf den Formaten aus der Datei **wordpress_basic.idml**  Diese kannst du natürlich anpassen.

![Formate](https://raw.githubusercontent.com/grefel/press2id/master/docu/assets/styles.png) 
