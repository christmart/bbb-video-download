
(function(){

	// CONFIG
	var backend          = "/bbb-download/"; // Backend URL
	var is_beta          = true;			// mark labels with "Beta"

	var use_bbb_download = true;		// enable support for bbb_download

	// page via turbolinks completed?
	var ready = function(callbackFunc) {
		if (document.readyState !== 'loading') {
			// Document is already ready, call the callback directly
			return callbackFunc();
		}
		// turbo links load event
		document.addEventListener('turbolinks:load', callbackFunc);
	};

	// parse url using an a-tag
	var parseURL = function(url) {
		var a = document.createElement('a');
		a.href = url;

		var query = {};
		var qlist = a.search.replace(/^\?/, '').split('&');
		for(var i = 0; i < qlist.length; i++) {
			var q = qlist[i].split('=');
			query[q[0]] = q[1];
		}
		return { url: a, query: query };
	};

	// ajax post
	var ajax_post = function(url, options, ok, fail) {

		options = options || {}
		var request = new XMLHttpRequest();
		if (options.params)
			request.open("POST", url + "?" +
					Object.keys(options.params).map(function(key){
						return key+"="+encodeURIComponent(options.params[key])
					}).join("&"), true);
		else
			request.open("POST", url, true);

		request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
		request.onreadystatechange = function() {

			if (request.readyState == 4 && request.status === 200) {
				if (ok) ok(request.responseText, options.context);
			} else if (request.status !== 200) {
				if (fail) fail(request.status, options.context);
			}
		};
		if (options.data)
			request.send(JSON.stringify(options.data));
		else
			request.send();
	};

	// tag wizard
	var tag = function(tag, innerHTML, attr) {
		attr = attr || {}
		var e = document.createElement(tag);
		Object.keys(attr).map(function(key) {
			switch (key) {
			case 'class':   attr.class.split(" ").forEach(function(c) { e.classList.add(c); }); break;
			case 'style': Object.keys(attr.style).forEach(function(k) { e.style[k] = attr.style[k]; }); break;
			default: e.setAttribute(key, attr[key]);
			}
		});
		if (innerHTML)
			e.innerHTML = innerHTML;
		return e;
	};

	// label enhancer
	var label = function(name) {
		return name + (is_beta ? '<span class="beta">(Beta)</span>' : '');
	};

	// add a button
	var add_button = function(elem, name, url, title) {
		if (!elem) return;
		var a = tag("a", label("Download"), {
			class: "btn btn-sm btn-secondary", target: '_blank', href: url, 
			title: "Download "+innerText(name)});
		elem.parentNode.insertBefore(a, elem.nextSibling);
		elem.parentNode.insertBefore(document.createElement("br"), elem.nextSibling);
	};

	// add empty menu
	var add_menu = function(elem) {
		if (!elem) return;
		elem.appendChild(tag('td',
			'<div class="item-action dropdown">'+
				'<a href="javascript:void(0)" data-toggle="dropdown" class="icon">'+
					'<i class="fas fa-ellipsis-v px-4"></i></a>'+
				'<div class="dropdown-menu dropdown-menu-right"></div>'+
			'</div>' , { class: "text-center" }));
	}

	// add a menu option
	var add_option = function(elem, name, url, icon) {
		if (!elem) return;
		icon = icon ? '<i class="dropdown-icon '+icon+'"></i>' : '';
		var a = tag("a", icon+label(name), {
			class: "dropdown-item", target: '_blank', href: url, 
			title: "Download "+innerText(name)});
		elem.insertBefore(a, elem.childNodes[3]);
	};

	var add_devider = function(elem, name) {
		if (!elem) return;
		var div = tag("div", '', { class: "dropdown-divider" });
		elem.insertBefore(div, elem.childNodes[3]);
	};

	// save innerText
	var innerText = function(elem) {
		if (!elem) return '';
		return elem.innerText || elem.textContent || elem;
	};

	// backend url
	var backend_url = function(meetingId, params) {
		var query = [];
		if (meetingId)
			query.push('meetingId='+encodeURIComponent(meetingId));;
		if (params)
			query = [].concat(query, Object.keys(params).map(function(key){
						return key+"="+encodeURIComponent(params[key])
					}));
		return backend + (query.length ? "?" + query.join('&') : '');
	};

	// main
	ready(function() {

		// are there any recodings on this page?
		var recordings = document.querySelector("#recording-table");
		if (!recordings) return;

		if (use_bbb_download) {
			var i18n_presentation_bbb_download = window.I18n.recording.format.presentation + " ohne Chat";
		}

		var i18n_presentation = window.I18n.recording.format.presentation;
		var i18n_download = "Download";

		// Add some css
		document.head.appendChild(tag('style',
			"text#recording-text { max-width:15em; display:inline-block; overflow:hidden; text-overflow:ellipsis}"+
			"#recording-table a.btn { width:100% }"+
			".card .table-responsive { overflow-x:unset }"+
			'body[data-action="server_recordings"] div.container.pt-6 { max-width:95% !important }'+
			'body[data-action="server_rroom"] div.container.pt-6 { max-width:95% !important }'+
			'body[data-action="index"] div.container.pt-6 { max-width:95% !important }'+
			'div.edit_hover_class { word-break: break-all; white-space: normal; }'+ /* temp until fixed */
			'div.dropdown-menu.dropdown-menu-right div.dropdown-divider:last-child { display:none }'+
			"span.beta { color:red; vertical-align:super; font-size:50% }"));

		// do the magic stuff
		var meetingId_elem = {};
		var line = recordings.querySelectorAll("tr");
		for(var i = 0; i < line.length; i++) {
			if (line[i].getAttribute("id") == 'no_recordings_found')
				continue;

			// get "presentation"
			var elem = line[i].querySelector("a.btn-primary[target=_blank]");
			if (!elem) continue;

			// parse meetingId
			var meetingId = parseURL(elem.getAttribute('href')).query['meetingId'];
			if (!meetingId) continue;

			// find menu container
			var menu = line[i].querySelector("div.dropdown-menu.dropdown-menu-right");
			if (!menu) {
				add_menu(line[i]);
				menu = line[i].querySelector("div.dropdown-menu.dropdown-menu-right");;
			}

			// store for ajax
			meetingId_elem[meetingId] = { elem: elem, menu: menu };

			// add title to presentation
			elem.setAttribute('title','Online '+i18n_presentation);

			// add title to recording-title
			var title = line[i].querySelector("#recording-title");
			text = line[i].querySelector("text");
			if (text) text.setAttribute('title', innerText(text));
			
		}

		if (Object.keys(meetingId_elem).length > 0) {
			// lookup existing downloadable recordings
			ajax_post(backend,{ 
					params : { mode: 'test' },
					data   : { meetingIds: Object.keys(meetingId_elem) }}, function(data, context) {
			
				var usable = JSON.parse(data);
				Object.keys(meetingId_elem).forEach(function(meetingId) {
					// Add buttons if download exists
					var url  = null;
					var name = null;

					if (use_bbb_download && usable[meetingId]['download']) {
						url = backend_url(meetingId, { mode: 'download' });
						name = i18n_presentation_bbb_download+" ("+i18n_download+")";
						add_option(meetingId_elem[meetingId].menu, name, url, 'fas fa-image');
					}
					if (url && name) {
						add_button(meetingId_elem[meetingId].elem, name, url);
						add_devider(meetingId_elem[meetingId].menu);
					}
				});
			});
		}
	});

})();
