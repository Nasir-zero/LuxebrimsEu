class PredictiveSearch extends HTMLElement {
	constructor() {
		super();
		this.input = this.querySelector('input[type="search"]');
		this.resultsContainer = this.querySelector('[data-predictive-search]');
		this.status = this.querySelector('.predictive-search-status');
		this.abortController = null;
		this.debounceTimer = null;
	}

	connectedCallback() {
		if (!this.input || !this.resultsContainer) return;
		this.addEventListener('keydown', this.onKeyDown.bind(this));
		this.input.addEventListener('input', this.onInput.bind(this));
		this.input.addEventListener('focus', this.open.bind(this));
		document.addEventListener('click', (e) => {
			if (!this.contains(e.target)) this.close();
		});
	}

	onKeyDown(event) {
		if (event.key === 'Escape') {
			this.close();
		}
	}

	onInput() {
		const query = (this.input.value || '').trim();
		if (!query) {
			this.clear();
			this.close();
			return;
		}

		clearTimeout(this.debounceTimer);
		this.debounceTimer = setTimeout(() => this.fetchResults(query), 250);
	}

	async fetchResults(query) {
		try {
			this.setAttribute('loading', '');
			this.open();

			if (this.abortController) this.abortController.abort();
			this.abortController = new AbortController();

			const base = window.routes?.predictive_search_url || '/search/suggest.json';
			const url = new URL(base, window.location.origin);
			url.searchParams.set('q', query);
			url.searchParams.set('resources[type]', 'product,collection,page,article,query');
			url.searchParams.set('resources[limit]', '4');
			url.searchParams.set('section_id', 'predictive-search');

			// Prevent any CDN/browser cache from serving stale results
			url.searchParams.set('_', String(Date.now()));

			const response = await fetch(url.toString(), {
				signal: this.abortController.signal,
				credentials: 'same-origin',
				cache: 'no-store',
				headers: { Accept: 'application/json' }
			});
			if (!response.ok) throw new Error('Predictive search request failed');

			let html = '';
			try {
				const data = await response.json();
				html = (data.sections && data.sections['predictive-search']) || '';
			} catch (_) {
				// Fallback: some stores/apps may return raw HTML
				const text = await response.text();
				try {
					const dataAlt = JSON.parse(text);
					html = (dataAlt.sections && dataAlt.sections['predictive-search']) || '';
				} catch (__) {
					html = text;
				}
			}
			this.resultsContainer.innerHTML = html || '';
			this.setStatusTextFromResults();
		} catch (err) {
			if (err.name !== 'AbortError') {
				this.resultsContainer.innerHTML = '';
				this.setStatus('');
			}
		} finally {
			this.removeAttribute('loading');
		}
	}

	setStatusTextFromResults() {
		const counter = this.querySelector('[data-predictive-search-live-region-count-value]');
		if (counter) {
			this.setStatus(counter.textContent.trim());
		}
	}

	setStatus(text) {
		if (!this.status) return;
		this.status.textContent = text || '';
	}

	clear() {
		this.resultsContainer.innerHTML = '';
		this.setStatus('');
	}

	open() {
		this.setAttribute('open', '');
	}

	close() {
		this.removeAttribute('open');
	}
}

customElements.define('predictive-search', PredictiveSearch);


