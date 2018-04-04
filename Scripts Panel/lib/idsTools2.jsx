/****************
* idsTools little helper for InDesign Scripting 
* @Version: 2.0
* @Date: 2018-03-28
* @Author: Gregor Fellenz, http://www.publishingx.de
* Acknowledgments: Library design pattern from Marc Aturet https://forums.adobe.com/thread/1111415

*/

$.global.hasOwnProperty('idsTools') || ( function (HOST, SELF) {
	HOST[SELF] = SELF;

	/****************
	* PRIVATE
	*/
	var INNER = {};
	INNER.version = "2018-03-28-2.0"

	/** Get the type area of the page 
	* @param {Page} page The reference page
	* @return {Array} Type area Array [y1,x1,y2,x2]
	*/
	INNER.getTypeArea = function (page) {
		var doc = page.parent.parent;
		var y1 = page.marginPreferences.top;
		var y2 = doc.documentPreferences.pageHeight - page.marginPreferences.bottom;
		if (page.side == PageSideOptions.LEFT_HAND) {
			var x1 = page.marginPreferences.right;
			var x2 = doc.documentPreferences.pageWidth - page.marginPreferences.left;
		} 
		else {
			var x1 = page.marginPreferences.left;
			var x2 = doc.documentPreferences.pageWidth - page.marginPreferences.right;
		}			
		return [y1 , x1 , y2 , x2];
	};


	/** Returns the <b>Page</b> which contains the Object
	* @param {Object} object PageItem, Text or Object
	* @return the <b>Page</b> containing the object, if no <b>Page</b> can be determined <b>null</b>
	*/
	INNER.getPageByObject = function (checkObject) {
		if (checkObject != null) {
			checkObject = checkObject.getElements ()[0]; // Problems with Baseclass Objects like PageItem in CS5!
			if (checkObject.hasOwnProperty("baseline")) {
				checkObject = checkObject.parentTextFrames[0];
			}
			while (checkObject != null) {
				if (checkObject.hasOwnProperty ("parentPage")) return checkObject.parentPage;
				var whatIsIt = checkObject.constructor;
				switch (whatIsIt) {
					case Page : return checkObject;
					case Character : checkObject = checkObject.parentTextFrames[0]; break;
					case Footnote :; // drop through
					case Cell : checkObject = checkObject.insertionPoints[0].parentTextFrames[0]; break;
					case Note : checkObject = checkObject.storyOffset.parentTextFrames[0]; break;
					case XMLElement : 
						if (checkObject.pageItems.length > 0) {									
							checkObject = checkObject.pageItems[0];
						}
						else if (checkObject.insertionPoints[0] != null) {
							if (checkObject.insertionPoints[0].parentTextFrames.length > 0) {
								checkObject = checkObject.insertionPoints[0].parentTextFrames[0]; 
							} 
							else {
								return null;
							}
						}
						break; 
					case Application : return null;
					default: checkObject = checkObject.parent;
				}
				if (checkObject == null) return null;
			}
			return checkObject;	
		} 
		else {
			return null;
		}
	};

	/** Creates a new Page and TextFrame. The TextFrame fits into the page margins
	* @param {Page} _page The reference page
	* @param {MasterSpread} [_master] The MasterSpread for the new page. If no value is given, the MasterSpread from <code>_page</code> is applied.
	* @param {_newPage} [Boolean]  Create a new page or not?
	* @return {TextFrame} The new TextFrame		
	*/
	INNER.addPageTextFrame = function(_page, _master, _newPage) {
		if (_newPage == undefined)  _newPage = true;
		var _dok = _page.parent.parent;
		if (_newPage ) {
			var _newPage = _dok.pages.add(LocationOptions.AFTER, _page);
			if (_master == undefined) _newPage.appliedMaster = _page.appliedMaster;
			else _newPage.appliedMaster = _master;
		}
		else {
			var _newPage = _page;
		}

		var newTextFrame = _newPage.textFrames.add();
		newTextFrame.geometricBounds = INNER.getTypeArea(_newPage);
		
		newTextFrame.textFramePreferences.textColumnCount = _newPage.marginPreferences.columnCount;
		newTextFrame.textFramePreferences.textColumnGutter =  _newPage.marginPreferences.columnGutter;
		
		return newTextFrame;
	};


	/****************
    * API 
    */

	/** Get the type area of the page 
	* @param {Page} page The reference page
	* @return {Array} Type area Array [y1,x1,y2,x2]
	*/
	SELF.getTypeArea = function (page) {
		return INNER.getTypeArea(page);
	}

	/** Checks the last TextFrame of the Story. If there is an overflow new Pages and TextFrames are added.
	* @param {Story} story The Story to check
	* @return {TextFrame} The last TextFrame
	*/
	SELF.checkOverflow = function (story) {
		story.insertionPoints[-1].contents = SpecialCharacters.ZERO_WIDTH_NONJOINER;
		var _lastTC = story.textContainers[story.textContainers.length - 1];
		var _run = true;
		while (_lastTC.overflows && _run) {
			var _last = story.textContainers.length -1;
			if (story.textContainers[_last].characters.length == 0 && _last -1 > -1 && story.textContainers[_last -1].characters.length == 0 && _last -1 > -2 && story.textContainers[_last -2].characters.length ==0 ) _run = false;
			var _page = INNER.getPageByObject(_lastTC);
			var _tf = INNER.addPageTextFrame(_page);
			_lastTC.nextTextFrame = _tf;
			_tf.appliedObjectStyle = _lastTC.appliedObjectStyle;
			_lastTC = _tf;
		}
		while (story.textContainers.length > 1 && _lastTC.characters.length == 0) {
			var _page = this.getPageByObject(_lastTC);
			_page.remove();
			_lastTC = story.textContainers[story.textContainers.length - 1];
		}
		story.characters[-1].contents = "";
	};
    /** Reset Measurement Units to mm and other default values
	* @param {Document} The document to process
	* @return {Object} The old values
    */
	SELF.resetDefaults = function(dok) {
		var oldValues = {
			horizontalMeasurementUnits:dok.viewPreferences.horizontalMeasurementUnits,
			verticalMeasurementUnits:dok.viewPreferences.verticalMeasurementUnits,
			viewPreferences:dok.viewPreferences.rulerOrigin,
			zeroPoint:dok.zeroPoint,
			textDefaultParStyle:dok.textDefaults.appliedParagraphStyle,
			textDefaultCharStyle:dok.textDefaults.appliedCharacterStyle,
			transformReferencePoint:dok.layoutWindows[0].transformReferencePoint
		}		
		dok.textDefaults.appliedCharacterStyle = dok.characterStyles[0];
		dok.textDefaults.appliedParagraphStyle = dok.paragraphStyles[1];
		dok.viewPreferences.horizontalMeasurementUnits = MeasurementUnits.MILLIMETERS;
		dok.viewPreferences.verticalMeasurementUnits = MeasurementUnits.MILLIMETERS;
		dok.viewPreferences.rulerOrigin = RulerOrigin.PAGE_ORIGIN;
		dok.zeroPoint = [0,0];
		dok.layoutWindows[0].transformReferencePoint = AnchorPoint.TOP_LEFT_ANCHOR;
		return oldValues;
	};
    /** Set Measurement Units to given values
	* @param {Document} The document to process
	* @return {Object} The values
    */
	SELF.setDefaults = function(dok, values) {
			dok.viewPreferences.horizontalMeasurementUnits = values.horizontalMeasurementUnits;
			dok.viewPreferences.verticalMeasurementUnits = values.verticalMeasurementUnits;
			dok.viewPreferences.rulerOrigin = values.viewPreferences;
			dok.zeroPoint = values.zeroPoint;
			dok.textDefaults.appliedParagraphStyle = values.textDefaultParStyle;
			dok.textDefaults.appliedCharacterStyle = values.textDefaultCharStyle;
			dok.layoutWindows[0].transformReferencePoint = values.transformReferencePoint;	
	};
	/**
	* Recursively remove XML-Tags 
	* @param {XMLElement} xmlElement The XML-Element to start from 
	*/
	SELF.untag = function (xmlElement) {
		while(xmlElement.xmlElements.length > 0) {
			xmlElement.xmlElements[-1].untag();
		}
	};


}) ( $.global, { toString : function() {return 'idsTools';} } );
