//
// Chapbook 1.0
//
// written by Chris Klimas - http://chapbook.googlecode.com/
// released under GPL v2
// requires Mootools - http://mootools.net/
//

Page = new Class ({
	initialize: function (li, section)
	{
		this.el = li;
		this.link = $E('a', li);
		
		if (this.link)
		{
			this.title = this.link.getText();
			this.url = this.link.href; // grab absolute URL
			
			li.id = this.url.fileName().replace(/\..*$/, '');
			li.obj = this;
			li.addEvent('click', this.display.bind(this));
			this.link.setAttribute('href', 'javascript:void(0)');
		};
	},
	
	display: function()
	{
		document.title = document.title.replace(/\:.*/, '') + ': ' + this.title;
		Contents.setHash(this.url);
		
		new Ajax(this.url,
						 { method: 'get',
						 	 onComplete: complete.bind(this),
						 	 onFailure: complete.bind(this)
						 }).request();
											 
		function complete (req)
		{
			var prev = this.before();
			var next = this.after();
			
			var src = '<h2>' + this.title + '</h2>';
			src += (req.responseText) ? req.responseText : req;

			if (! window.ie)
			{
				var fx = new Fx.Style('page', 'opacity');
				fx.set(0);
			};
			
			if (Contents.haloscan)
				src += '<div id="comments"><h3>Comments</h3></div>';
			
			$('page').setHTML(src);
			this.localizeLinks.bind(this, $('page')).call();
			
			// summon our comments
			
			if (Contents.haloscan)
			{
				var url = 'http://www.haloscan.com/comments/' + Contents.haloscan.user
									+ '/';
									
				if (Contents.haloscan.prefix)
					url += Contents.haloscan.prefix + ':';
					
				url += this.url.toHash() + '/?m=1';
									
				var c = new Element('script');
				c.setAttribute('type', 'text/javascript');
				c.setAttribute('src', url);
				$('page').adopt(c);
			};
			
			// add next/previous links
			
			if (prev)
			{
				var prevEl = new Element('p');
				prevEl.addClass('prev');
				prevEl.setText(prev.title);
				prevEl.addEvent('click', prev.display.bind(prev));
				$('page').adopt(prevEl);
			};
			
			if (next)
			{
				var nextEl = new Element('p');
				nextEl.addClass('next');
				nextEl.setText(next.title);
				nextEl.addEvent('click', next.display.bind(next));
				$('page').adopt(nextEl);
			};

			// give only our list item the 'selected' class
			
			$$('#contents li ol li').each(function (i)
			{
				if (i == this.el)
					i.addClass('selected');
				else
					i.removeClass('selected');
			}, this);
			
			// make sure that our section is opened
			
			Contents.open(this.el);
			window.scroll(0, 0);

			if (! window.ie)
				fx.start(1);
		}
	},
	
	localizeLinks: function (el)
	{	
		// fix img URLs
	
		$ES('img', el).each( function (i)
		{		
			if (! i.hasClass('external'))
				i.src = i.src.replace(Contents.url.basePath(), this.url.basePath());
		}, this);
		
		// make internal links display their pages via JavaScript
		// add targets to external links
		
		$ES('a', el).each(function (i)
		{		
			if ((! i.hasClass('external')) &&
					(i.href.indexOf(Contents.url.basePath() != -1)))
			{
				var link = $(i.href.fileName().replace(/\..*$/, ''));
				
				if (link)
				{
					i.addEvent('click', link.obj.display.bind(link.obj));
					i.href = 'javascript:void(0)';
				}
			}
			else
				i.target = '_blank';
		}, this);
	},
	
	before: function()
	{
		var els = $$('#contents li ol li');
	
		for (var i = 1; i < els.length; i++)
			if (els[i].obj == this)
				return els[i - 1].obj;
	},
	
	after: function()
	{
		var els = $$('#contents li ol li');
	
		for (var i = 0; i < els.length - 1; i++)
			if (els[i].obj == this)
				return els[i + 1].obj;
	}
});

Contents = {
	initialize: function()
	{	
		this.url = location.href.replace(/#.*$/, '');
	
		// do we have a haloscan account?
		
		if ($('haloscan'))
		{
			this.haloscan = { user: $('haloscan').getAttribute('user'),
												prefix: $('haloscan').getAttribute('prefix') };
				
			document.write = Contents.outputToComments;
		};
	
		// find our sections
		// (these are defined as lis with an ol under them)
		// then instantiate our pages

		this.pages = [];
		
		var sectionEls = [];
		var index = 0;

		$$('#contents li').each(function (i)
		{
			var subels = $ES('ol', i);
			
			if (subels.length > 0)
			{
				sectionEls.push(i);
				i.setAttribute('index', index++);
			}
			else
				this.pages.push(new Page(i));
		}, this);
		
		// create our accordion
	
		this.ac = new Accordion(sectionEls,
														$$('#contents li ol'),
														{ onActive: function (i) { i.addClass('open') },
														  onBackground: function(i) { i.removeClass('open') },
														  display: (location.hash == '') ? 0 : -1
														});
						
		// watch for hash changes
		
		this.hash = '';
		this.watchHash.periodical(500, this);
	},
	
	outputToComments: function (src)
	{
		$('comments').innerHTML += src;
		
		// make any newly created forms pop into a new window
		
		$ES('form', $('comments')).each(function (i)
		{
			i.setAttribute('target', '_blank');
		});
	},

	open: function (el)
	{
		while (el && ! el.getAttribute('index'))
			el = el.getParent();
			
		if (el)
			this.ac.display(el.getAttribute('index'));
	},
	
	setHash: function (url)
	{
		var hash = url.replace(Contents.url.basePath(), '').toHash();
	
		location.hash = hash;
		this.hash = location.hash;
	},
	
	watchHash: function()
	{
		if (location.hash != this.hash)
		{
			if (location.hash != '')
			{
				var newUrl = location.hash.slice(1).toUrl();
							
				$$('#contents li ol li').each (function (i)
				{
					if (i.obj.url == newUrl)
						i.obj.display();
				});
			};
			
			this.hash = location.hash;
		}
	}
};

String.prototype.toHash = function()
{
	var result = this.replace(Contents.url.basePath(), '');
	result = result.replace('/', ',');
	result = result.replace(/.html$/, '');
		
	return result;
};

String.prototype.toUrl = function()
{
	var result = this.replace(',', '/');	
	return Contents.url.basePath() + result + '.html';
};

String.prototype.basePath = function()
{
	return this.replace(/(.*)\/.*/, '$1/');
};

String.prototype.fileName = function()
{
	return this.replace(/^.*\//g, '');
};

Window.onDomReady(function() { Contents.initialize() });

