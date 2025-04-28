var px = {
    projectName: "@px:project@",
    version: "@px:date@-@px:version@",

    siteURL: null, // Wenn ein Wert eingetragen wird, wird die Startseite übersprungen z.B, siteURL: "https://www.indesignblog.com",
    // siteURL: "https://www.indesignblog.com",
    runMode: null, // Wenn ein Wert eingetragen ist, wird die Modus Auswahlseite übersprungen
    // runMode: RunModes.TEMPLATE,

    authenticate: false,
    user: "",
    password: "",

    defaultHeader: [{ name: "User-Agent", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:110.0) Gecko/20100101 Firefox/110.0" }],

    postIDLabel: "px:postID:px",

    // Verwaltung
    tempFileArray: [],
    showGUI: true,
    appendLog: true,
    debug: true // release with false
}

var configObject = {
    version: "2.40",
    urlList: ["https://www.indesignblog.com/", "https://www.publishingx.de/"],
    siteURL: undefined,
    restURL: undefined,
    basicAuthentication: {  // Do not put values here! Defaults are defined in px.authenticate
        authenticate: false,
        user: "",
        password: ""
    },

    runMode: RunModes.PLACE_GUN,

    filterAfterDate: "2003-05-27",
    filterBeforeDate: "2030-01-01",
    orderBy: "desc", // asc oder desc
    categoryID: undefined,
    categoryArray: [],
    downloadFeaturedImage: true,
    loadImagesToPlaceGun: true, // if false, all images are anchored into the text flow    
    downloadImages: true,
    localImageFolder: undefined,
    endPoint: "posts",
    category: undefined,
    styleTemplateFile: "wordrepss_basic.idml",
    xsltFile: "wordrepss_basic.xsl",
    masterSpreadStart: "W-WordPress",
    masterSpreadFollow: "W-WordPress-follow",
    startPage: "NEXT", // LEFT OR RIGHT
    fixOverflow: true, // TEMPLATE Mode only fix overflow with masterSpreadFollow
}
