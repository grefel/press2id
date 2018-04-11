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
