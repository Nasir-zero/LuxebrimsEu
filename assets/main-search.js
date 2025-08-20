const BaseSearchForm = window.SearchForm || class extends HTMLElement {
	constructor() {
		super();
		this.input = this.querySelector('input[type="search"]') || document.querySelector('input[type="search"]');
	}

	onFormReset() {
		if (this.input) this.input.value = '';
	}

	shouldResetForm() {
		return true;
	}
};

class MainSearch extends BaseSearchForm {
	constructor() {
		super();
		this.allSearchInputs = document.querySelectorAll('input[type="search"]');
		this.setupEventListeners();
	}

	setupEventListeners() {
		let allSearchForms = [];
		this.allSearchInputs.forEach(input => allSearchForms.push(input.form))
		this.input.addEventListener('focus', this.onInputFocus.bind(this));
		// Ensure submitting from any search input always navigates (avoid stale results without refresh)
		if (this.input && this.input.form) {
			this.input.form.addEventListener('submit', (event) => {
				try {
					event.preventDefault();
					const form = this.input.form;
					const action = form.getAttribute('action') || (window.routes && window.routes.search_url) || '/search';
					const params = new URLSearchParams(new FormData(form));
					// normalize q
					if (!params.has('q')) params.set('q', this.input.value || '');
					// keep Shopify prefix option if present in DOM; otherwise default to 'last'
					if (!params.has('options[prefix]')) params.set('options[prefix]', 'last');
					const url = `${action}?${params.toString()}`;
					window.location.assign(url);
				} catch (_) {
					// fallback to native submit if anything goes wrong
					this.input.form.submit();
				}
			});
			// Enter key should submit, even if some script prevents default on keydown
			this.input.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					this.input.form.requestSubmit ? this.input.form.requestSubmit() : this.input.form.submit();
				}
			});
		}
		if (allSearchForms.length < 2) return;
		allSearchForms.forEach(form =>
			form.addEventListener('reset', this.onFormReset.bind(this))
		);
		this.allSearchInputs.forEach(input =>
			input.addEventListener('input', this.onInput.bind(this))
		);
	}

	onFormReset(event) {
		super.onFormReset(event);
		if (super.shouldResetForm()) {
			this.keepInSync('', this.input);
		}
	}

	onInput(event) {
		const target = event.target;
		this.keepInSync(target.value, target);
	}

	onInputFocus() {
		const isSmallScreen = window.innerWidth < 750;
		if (isSmallScreen) {
			this.scrollIntoView({ behavior: 'smooth' });
		}
	}

	keepInSync(value, target) {
		this.allSearchInputs.forEach(input => {
			if (input !== target) {
				input.value = value;
			}
		});
	}
}

customElements.define('main-search', MainSearch);
