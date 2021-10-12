document.addEventListener("click", (e) => {
	var page = browser.extension.getBackgroundPage();

	if (e.target.classList.contains("blankify")) {
		page.blankifyStart()
		window.close()
	}
	else if (e.target.classList.contains("unBlankify")) {
		page.unBlankifyStart()
		window.close()
	}
	else if (e.target.classList.contains("unBlankifyAll")) {
		page.unBlankifyAllStart()
		window.close()
	}

});




