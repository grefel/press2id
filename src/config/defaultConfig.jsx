var px = {
    projectName: "@px:project@",
    version: "@px:date@-@px:version@",

    siteURL: "https://www.macwelt.de/",
    runMode: RunModes.TEMPLATE,

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
    version: "2.39",
    urlList: ["https://www.macwelt.de/"],
    siteURL: "https://www.macwelt.de/",
    restURL: undefined,
    basicAuthentication: {  // Do not put values here! Defaults are defined in px.authenticate
        authenticate: false,
        user: "",
        password: ""
    },

    runMode: RunModes.TEMPLATE,

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
    masterSpreadStart: "A-Artikelstart",
    masterSpreadFollow: "F-Folgeseite",
    startPage: "LEFT", // LEFT OR RIGHT
    fixOverflow: true // TEMPLATE Mode only fix overflow with masterSpreadFollow
}
