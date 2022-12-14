// Copyright 2020 Jerzy Głowacki

(function () {
    var html = document.documentElement;

    function cachedFetch(url, options) {
        var cached = sessionStorage.getItem(hashCode(url));
        if (cached) {
            return Promise.resolve(JSON.parse(cached));
        }
        return fetch(url, options).then(function (res) {
            res.clone().text().then(function (content) {
                try {
                    sessionStorage.setItem(hashCode(url), content);
                } catch (e) {
                }
            });
            return res.json();
        });
    }

    function hashCode(s) {
        var hash = 0;
        for (var i = 0; i < s.length; i++) {
            var chr = s.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash &= hash;
        }
        return hash;
    }

    function init() {
        var isAmp = html.hasAttribute("amp") || html.hasAttribute("⚡") || html.hasAttribute("mip");
        var ampUrl = (document.querySelector("link[rel='amphtml']") || document.querySelector("link[rel='miphtml']") || {}).href;
        var canonicalUrl = (document.querySelector("link[rel='canonical']") || {}).href;
        var isGoogleCache = location.hostname.indexOf("cdn.ampproject.org") > -1;
        var isGoogleUrl = location.hostname.indexOf("google.") > -1 && location.pathname === "/url";
        var isGoogleSerp = location.hostname.indexOf("google.") > -1 && location.pathname === "/search";

        if (isGoogleCache) {
            var fwdLink = document.querySelector(".fwdlnk");
            if (fwdLink) {
                fwdLink.click();
                return;
            }
        } else if (isGoogleUrl) {
            var aLink = document.querySelector("a[href^='http']");
            if (aLink) {
                aLink.click();
                return;
            }
        } else if (isGoogleSerp) {
            document.addEventListener("DOMContentLoaded", function () {
                var ampIcon = " <img src='data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2040%2040%22%3E%3Cpath%20fill%3D%22%230379C4%22%20d%3D%22M26.6%201l-4%2015.5h3.7c1%200%201.4.8.8%201.8l-12.7%2021c1.8.4%203.7.7%205.7.7%2011%200%2020-9%2020-20%200-8.7-5.6-16.2-13.4-19zm-9.3%2022.4h-3.6c-1%200-1.4-.8-.8-1.8L25.6.8C24%20.3%2022%200%2020%200%209%200%200%209%200%2020c0%208.7%205.6%2016.2%2013.4%2019l4-15.6z%22%2F%3E%3C%2Fsvg%3E' width='12' height='12' alt='AMP' title='AMP'>";
                var serpLinks = document.querySelectorAll("#res a[href][ping]:not([href*='.google.']):not([href*='twitter.com']):not([href*='wikipedia.org']):not([href*='googleusercontent.com'])");
                var urls = Array.prototype.map.call(serpLinks, function (link) { return link.href; }).slice(0, 50);
                cachedFetch("https://acceleratedmobilepageurl.googleapis.com/v1/ampUrls:batchGet?key=AIzaSyCcQl-54dUpBvgPOISXs9CoAur9LFngUOg", {method: "post", headers: {"Content-Type": "application/json"}, body: JSON.stringify({urls: urls})}).then(function (json) {
                    if (json) { //AMP Cache API
                        serpLinks.forEach(function (link) {
                            [].concat(json.ampUrls).forEach(function (url) {
                                if ((url || {}).originalUrl === link.href) {
                                    link.href = url.cdnAmpUrl;
                                    link.innerHTML += ampIcon;
                                    link.onmousedown = null;
                                }
                            });
                        });
                    } else { //Google fallback
                        cachedFetch(location.href + '&AMPBrowser').then(function (res) {
                            return res.text();
                        }).then(function (text) {
                            var html = (new DOMParser()).parseFromString(text, "text/html");
                            var ampLinks = html.querySelectorAll("a[data-amp]");
                            if (ampLinks) {
                                serpLinks.forEach(function (link) {
                                    ampLinks.forEach(function (ampLink) {
                                        if (ampLink.dataset.ampCur === link.href) {
                                            link.href = ampLink.href;
                                            link.innerHTML += ampIcon;
                                            link.onmousedown = null;
                                        }
                                    });
                                });
                            }
                        });
                    }
                });
            });
        }

        var amp = {
            source: "MobileApk",
            isAmp: isAmp,
            hostname: location.hostname,
            ampUrl: ampUrl,
            canonicalUrl: canonicalUrl
        };
        console.log(amp);

        chrome.runtime.sendMessage(amp, function (response) {
            if ((response || {}).url) {
                window.stop();
                html.id = "amp-browser-viewer";
                html.innerHTML = "<head>" + Array.prototype.map.call(html.querySelectorAll("meta, title, link[rel~='icon']"), function (el) { return el.outerHTML; }).join('') + "</head><body><iframe src='" + response.url + "' allow='autoplay' allowfullscreen allowpaymentrequest></iframe></body>";
            }
        });
    }

    var tries = 10;
    var interval = setInterval(function () {
        console.log('Searching...');
        var link = document.querySelector("link[rel='amphtml'], link[rel='miphtml'], link[rel='canonical']");
        if (link || !tries--) {
            console.log('Found:', link);
            clearInterval(interval);
            init();
        }
    }, 100);
}());
