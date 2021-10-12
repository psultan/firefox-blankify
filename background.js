function restoreTitle(tabs){
	let blankTab = null;
	let goodTab = null;
	for (tab of tabs){
		if (tab.title.endsWith("Blankify")){
			console.log("Auto Title Skipped")
			return
		}
		
		if(tab.url.endsWith("test.html")){
			blankTab = tab;
		}
		else{
			goodTab = tab;
		}
		if (blankTab && goodTab){
			console.log("Auto Changing Blank to:", goodTab.title)
			activeTitle = goodTab.title;
			browser.tabs.executeScript(blankTab.id, {
				matchAboutBlank: true,
				code: `document.title = "${goodTab.title} - Blankify";
				document.getElementById("title").innerText = "${goodTab.title}"
				document.getElementById("url").innerText = "${goodTab.url}"
				`
			})
			break;
		}
	}
}
function handleUpdated(tabId, changeInfo, tabInfo) {
	if (tabInfo.url.endsWith("test.html")){
		if (changeInfo.status == "complete"){
			setTimeout(function(){
				console.log("Auto Update", tabId, changeInfo)
				querying = browser.tabs.query({windowId: tabInfo.windowId}).then(restoreTitle);
			}, 30000)   //1 minute - firefox needs time boot up
		}
	}
}
browser.tabs.onUpdated.addListener(handleUpdated);
console.log("onUpdate Registered")

let local = "https://psultan.github.io/firefox-blankify/blank.html"
function blankify(windowInfoArray) {
	let promises = [];
	let dupBlanks = []
	function changeTitle(tab, activeTitle, activeUrl){
		console.log("Changing Active", tab.title, activeTitle)
		let action = browser.tabs.executeScript(tab.id, {
			code: `document.title = "${activeTitle} - Blankify";
			document.getElementById("title").innerText = "${activeTitle}"
			document.getElementById("url").innerText = "${activeUrl}"
			`
		});
		console.log("Action", action)
		promises.push(action)
	}
	
	for (windowInfo of windowInfoArray) {
		let active = null;
		let activeTitle = ""
		let activeUrl = ""
		let skip = false;
		let currentBlank = null;
		for (tab of windowInfo.tabs){
			if(tab.active){
				active = tab;
				activeTitle = tab.title;
				activeUrl = tab.url;
			}
			else{
				if(currentBlank && (tab.title.endsWith("Blankify") || tab.url.endsWith("test.html"))){
					console.log("Adding to Dups", tab)
					dupBlanks.push(currentBlank.id)
					currentBlank = tab
				}
			}
			
			if(tab.title.endsWith("Blankify") || tab.url.endsWith("test.html")){
				currentBlank = tab;
			}

		}
		
		if (active==currentBlank){
			continue
		}
		else if (currentBlank){
			let switchtab = browser.tabs.update(currentBlank.id, {active:true})
			switchtab.then(tab => changeTitle(tab, activeTitle, activeUrl));
			promises.push(switchtab)
		}
		else{
			console.log("Blanking:", activeTitle)
			let newtab = browser.tabs.create({
				url: local,
				windowId: windowInfo.id,
			});
			newtab.then(tab => changeTitle(tab, activeTitle, activeUrl));
			promises.push(newtab)
		}
	}
	
	console.log("Waiting for", promises)
	Promise.all(promises).then((values) => {
		console.log("Removing Dup Blanks", dupBlanks)
		browser.tabs.remove(dupBlanks);
		discardAll(windowInfoArray)
	});
}
function unBlankify(tabs) {
	let promises = [];
	let goodTabs = {};
	let badTabs = [];

	for (tab of tabs){
		if(tab.title.endsWith("Blankify")){
			console.log("Unblanking:", tab.title)
			setTab = tab.title.substring(0,tab.title.length-11)
			badTabs.push(tab.id)
		}
		else if(tab.url.endsWith("test.html")){
			console.log("Unblanking:", tab.url)
			badTabs.push(tab.id)
		}
		else{
			goodTabs[tab.title] = tab.id;
		}
	}
	
	if(setTab in goodTabs){
		let updateP = browser.tabs.update(goodTabs[setTab], {active:true})
		promises.push(updateP)
	}
	
	console.log("Waiting for", promises)
	Promise.all(promises).then((values) => {
		browser.tabs.remove(badTabs);
	});
}
function unBlankifyAll(windowInfoArray) {
	let promises = [];
	let goodTabs = {};
	let badTabs = [];
	
	for (windowInfo of windowInfoArray) {
		for (tab of windowInfo.tabs){
			if(tab.title.endsWith("Blankify")){
				setTab = tab.title.substring(0,tab.title.length-11)
				console.log("Unblanking:", tab.title)
				badTabs.push(tab.id)
			}
			else if(tab.url.endsWith("test.html")){
				console.log("Unblanking:", tab.url)
				badTabs.push(tab.id)
			}
			else{
				goodTabs[tab.title] = tab.id;
			}
		}
		
		if(setTab in goodTabs){
			//if blakify's title exists in goodtabs make it active
			let updateP = browser.tabs.update(goodTabs[setTab], {active:true})
			promises.push(updateP)
		}
	}
	
	console.log("Waiting for", promises)
	Promise.all(promises).then((values) => {
		browser.tabs.remove(badTabs);
	});
}
function discardAll(windowInfoArray){
	ids = []
	console.log("Discarding")
	
	for (windowInfo of windowInfoArray) {
		for (tab of windowInfo.tabs){				
			console.log("Discarding", tab.id, tab.title)
			
			img = new Image();
			img.crossOrigin = 'anonymous';
			img.src = tab.favIconUrl || "/icons/page-48.png";
			let tabId = tab.id;
			img.onload = function(){
				const img = this;
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d');
				if (ctx) {
					canvas.width = img.width;
					canvas.height = img.height;

					ctx.globalAlpha = 0.6;
					ctx.drawImage(img, 0, 0);

					ctx.globalAlpha = 1;
					ctx.beginPath();
					ctx.fillStyle = '#f40fdb';
					ctx.arc(img.width * 0.75, img.height * 0.75, img.width * 0.25, 0, 2 * Math.PI, false);
					ctx.fill();
					const href = canvas.toDataURL('image/png');
					
					let run = browser.tabs.executeScript(tabId, {
						allFrames: true,
						matchAboutBlank: true,
						code: `
						window.stop();
						if (window === window.top) {
						  [...document.querySelectorAll('link[rel*="icon"]')].forEach(link => link.remove());
						  document.querySelector('head').appendChild(Object.assign(document.createElement('link'), {
							rel: 'icon',
							type: 'image/png',
							href: '${href}'
						  }));
						  console.log("Changing Favicon", ${tabId})
						}
						`
					})
				}
			}
			
			ids.push(tab.id)
		}
	}
	
	setTimeout(function(){   //cannot update icon on discarded tabs
		console.log("Discarding", ids)
		browser.tabs.discard(ids)
	}, 5000)
}


function blankifyStart(){
	browser.windows.getAll({populate: true}).then(blankify);
}
function unBlankifyStart(){
	browser.tabs.query({currentWindow: true}).then(unBlankify);
}
function unBlankifyAllStart(){
   browser.windows.getAll({populate: true}).then(unBlankifyAll);
}

