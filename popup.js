/**
 * CokiesType = {
 * 	name: string,
 * 	value: string,
 * }[]
 */
let cookies = [];
let cookieItems = [];
let deleteButtons = [];

document.addEventListener('DOMContentLoaded', () => {
	const newCookieButton = document.getElementById('new-cookie');
	const copyCookiesButton = document.getElementById('copy-cookies');
	const pasteCookiesButton = document.getElementById('paste-cookies');
	const clearCookiesButton = document.getElementById('clear-cookies');

	if (!newCookieButton || !copyCookiesButton || !pasteCookiesButton || !clearCookiesButton) {
		console.error("Missing required DOM elements. Please check your HTML structure.");
		return;
	}

	renderByStorage();

	newCookieButton.addEventListener('click', () => {
		createCookie("");
		updateDeleteButtons();
	});

	clearCookiesButton.addEventListener('click', () => clearCookies());
	copyCookiesButton.addEventListener('click', () => copyCookies());
	pasteCookiesButton.addEventListener('click', () => pasteCookies());
})

/**
 * Update cookie items and delete buttons dynamically.
 */
const updateDeleteButtons = () => {
	const deleteButtons = document.querySelectorAll('.delete-cookie');
	deleteButtons.forEach((deleteButton) => {
		deleteButton.addEventListener('click', (event) => {
			const element = event.target.closest('.cookie-item');
			if (element) {
				removeCookie(element);
			}
		});
	});
};

/**
 * Create a new cookie in the list
 * @param {string} value 
 */
const createCookie = (value) => {
	const cookieList = document.getElementById('cookies-list');
	if (!cookieList) {
		return;
	}

	const newCookieItem = document.createElement('label');
	newCookieItem.classList.add('cookie-item');
	newCookieItem.innerHTML += `
	<label class="cookie-item">
		<input type="text" value="${value}" id="cookie-${value}" class="cookie-name" placeholder="Cookie Name">
		<button class="delete-cookie">Delete</button>
	</label>`;
	cookieList.appendChild(newCookieItem);
}

/**
 * Remove a cookie from the list
 * @param {HtmlElement} element 
 */
const removeCookie = (element) => {
	const name = element.querySelector('.cookie-name').value;
	cookies = cookies.filter((cookie) => cookie.name !== name);
	element.remove();
}

/**
 * Clear the cookies list
 */
const clearCookies = () => {
	const cookieList = document.getElementById('cookies-list');
	if (!cookieList) {
		return;
	}

	cookieList.innerHTML = "";

	cookies = [];
	clearStorage();
	alert("Cookies cleared");
}

/**
 *  Copy cookies to extension storage
 */
const copyCookies = async () => {
	const cookieItems = document.querySelectorAll('.cookie-item');

	const cookiesArray = Array.from(cookieItems)

	const isEmpty = cookiesArray.every(item => {
		const cookieNameInput = item.querySelector('.cookie-name');
		return cookieNameInput === null || cookieNameInput.value.trim() === '';
	});

	if (isEmpty) {
		alert("No cookies to copy, cp cookies are empty now");
		clearStorage();
		return;
	}

	const cookiesArryPromises = cookiesArray.map((item) => {
		const name = item.querySelector('.cookie-name').value;
		return getCookie(name);
	});

	await Promise.all(cookiesArryPromises);

	saveToStorage();
	alert("Cookies copied to extension storage");
};

/**
 * Get a cookie by name
 * @param {string} name 
 */

const getCookie = async (name) => {
	if (!name) {
		alert("Cookie name is required");
		return;
	}

	return new Promise((resolve, reject) => {
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (!tabs || tabs.length === 0) {
				alert("Tab not allowed.");
				reject("Tab not allowed.");
				return;
			}

			const url = tabs[0].url;
			if (!url.startsWith("http")) {
				alert("Invalid URL");
				reject("Invalid URL");
				return;
			}

			chrome.cookies.get({ url: url, name }, (cookie) => {
				if (!cookie) {
					alert(`Cookie ${name} not found`);
					reject(`Cookie ${name} not found`);
				} else {
					const cookieAlreadyExistsIndex = cookies.findIndex((c) => c.name === cookie.name);

					if (cookieAlreadyExistsIndex !== -1) {
						cookies[cookieAlreadyExistsIndex].value = cookie.value;
						resolve();
						return;
					}

					cookies.push({ name: name, value: cookie.value });
					resolve();
				}
			});
		});
	});
};

/**
 * Paste cookies to browser
 */
const pasteCookies = async () => {
	try {
		await setCookie(cookies);
	} catch (error) {
		console.error(error);
	}
};


/**
 * Set cookies from extension storage
 * @param {CookiesType[]} cookiesToSet
 */
const setCookie = async (cookiesToSet) => {
	try {
		await chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (!tabs || tabs.length === 0) {
				alert("Tab not allowed.");
				return;
			}

			const url = tabs[0].url;
			if (!url.startsWith("http")) {
				alert("Invalid URL");
				return;
			}

			const currentTab = tabs[0];
			const storeId = currentTab.incognito ? "1" : "0";

			for (const cookie of cookiesToSet) {
				try {
					chrome.cookies.set({ url: url, name: cookie.name, value: cookie.value, storeId });
				} catch (error) {
					alert(`Failed to set cookie ${cookie.name}`);
					console.error(error);
				}
			}
			alert("Cookies pasted finished");

		})
	} catch (error) {
		console.error(error);
	}
};

/** 
 * Clear chrome storage
 */
const clearStorage = () => {
	chrome.storage.local.set({ "cp-cookies-list": JSON.stringify([]) });
}

/**
 * Render cookies from storage
 */
const renderByStorage = () => {
	chrome.storage.local.get(["cp-cookies-list"], (result) => {
		const parsedCookies = JSON.parse(result["cp-cookies-list"] || "[]");
		cookies.push(...parsedCookies);
		if (cookies.length === 0) {
			createCookie("");
			updateDeleteButtons();
		}
		cookies.forEach((cookie) => {
			createCookie(cookie.name)
			updateDeleteButtons();
		});
	});
}

/**
 * Save cookies to storage
 */
const saveToStorage = () => {
	chrome.storage.local.set({ "cp-cookies-list": JSON.stringify(cookies) });
}
