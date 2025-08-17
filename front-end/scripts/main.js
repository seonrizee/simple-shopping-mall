/**
 * 간단한 쇼핑몰 메인 JavaScript
 * 상태 관리, 컴포넌트, 이벤트 처리를 포함한 완전한 프론트엔드 시스템
 */

// ===============================
// 전역 상수 및 설정
// ===============================
const CONFIG = {
    API_BASE_URL: 'http://localhost:8080/api', // 백엔드 API 기본 URL
    ITEMS_PER_PAGE: 20,
    DEBOUNCE_DELAY: 300,
    NOTIFICATION_DURATION: 3000,
    MAX_PRICE: 1000000,
    SHIPPING_THRESHOLD: 50000, // 무료배송 기준금액
    SHIPPING_COST: 3000
};

// ===============================
// 유틸리티 함수
// ===============================
class Utils {
    // 디바운스 함수
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 숫자를 한국 원화 형식으로 포맷
    static formatCurrency(amount) {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW',
            minimumFractionDigits: 0
        }).format(amount);
    }

    // HTML 이스케이프
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ID 생성기
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 로컬 스토리지 안전한 접근
    static safeLocalStorage = {
        get: (key, defaultValue = null) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.warn('localStorage get error:', error);
                return defaultValue;
            }
        },
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.warn('localStorage set error:', error);
                return false;
            }
        },
        remove: (key) => {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.warn('localStorage remove error:', error);
                return false;
            }
        }
    };
}

// ===============================
// 상태 관리 시스템
// ===============================
class StateManager {
    constructor() {
        this.state = {
            products: [],
            filteredProducts: [],
            cart: [],
            filters: {
                category: '',
                maxPrice: CONFIG.MAX_PRICE,
                search: '',
                sortBy: 'relevance'
            },
            ui: {
                cartOpen: false,
                loading: false,
                currentPage: 1,
                viewMode: 'grid', // 'grid' 또는 'list'
                hasMore: false
            }
        };
        
        this.listeners = new Map();
        this.previousState = {};
        
        // 성능 모니터링 (loadFromStorage보다 먼저 초기화)
        this.performanceMetrics = {
            stateUpdates: 0,
            renderTime: 0
        };
        
        // 초기 상태 로드
        this.loadFromStorage();
    }

    // 상태 변경 구독
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
        
        // 구독 해제 함수 반환
        return () => {
            const keyListeners = this.listeners.get(key);
            if (keyListeners) {
                keyListeners.delete(callback);
            }
        };
    }

    // 상태 변경 알림
    notify(key, data, oldData) {
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            keyListeners.forEach(callback => {
                try {
                    callback(data, oldData);
                } catch (error) {
                    console.error(`Error in ${key} listener:`, error);
                }
            });
        }
    }

    // 상태 가져오기
    getState(path = null) {
        if (!path) return this.state;
        
        const keys = path.split('.');
        let result = this.state;
        
        for (const key of keys) {
            if (result && typeof result === 'object' && key in result) {
                result = result[key];
            } else {
                return undefined;
            }
        }
        
        return result;
    }

    // 상태 업데이트 (불변성 보장)
    setState(updates, notify = true) {
        this.performanceMetrics.stateUpdates++;
        
        const oldState = JSON.parse(JSON.stringify(this.state));
        this.previousState = oldState;
        
        // 깊은 병합
        this.state = this.deepMerge(this.state, updates);
        
        if (notify) {
            // 변경된 키들에 대해 알림
            this.notifyChanges(oldState, this.state, '');
        }
        
        // 영속화
        this.saveToStorage();
    }

    // 깊은 병합 유틸리티
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }

    // 변경 사항 알림
    notifyChanges(oldState, newState, path) {
        for (const key in newState) {
            const newPath = path ? `${path}.${key}` : key;
            const oldValue = oldState[key];
            const newValue = newState[key];
            
            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                this.notify(newPath, newValue, oldValue);
                
                // 중첩된 객체의 경우 재귀적으로 확인
                if (newValue && typeof newValue === 'object' && !Array.isArray(newValue)) {
                    this.notifyChanges(oldValue || {}, newValue, newPath);
                }
            }
        }
    }

    // 로컬 스토리지에 저장
    saveToStorage() {
        const persistData = {
            cart: this.state.cart,
            filters: this.state.filters,
            ui: {
                viewMode: this.state.ui.viewMode
            }
        };
        
        Utils.safeLocalStorage.set('shoppingMallState', persistData);
    }

    // 로컬 스토리지에서 로드
    loadFromStorage() {
        const saved = Utils.safeLocalStorage.get('shoppingMallState');
        if (saved) {
            this.setState(saved, false);
        }
    }

    // 상태 초기화
    resetState() {
        this.state = {
            products: this.state.products, // 상품 데이터는 유지
            filteredProducts: this.state.products,
            cart: [],
            filters: {
                category: '',
                maxPrice: CONFIG.MAX_PRICE,
                search: '',
                sortBy: 'relevance'
            },
            ui: {
                cartOpen: false,
                loading: false,
                currentPage: 1,
                viewMode: 'grid',
                hasMore: false
            }
        };
        
        Utils.safeLocalStorage.remove('shoppingMallState');
    }

    // 성능 메트릭 가져오기
    getPerformanceMetrics() {
        return this.performanceMetrics;
    }
}

// ===============================
// 알림 시스템
// ===============================
class NotificationSystem {
    constructor() {
        this.container = document.getElementById('notifications');
        this.notifications = new Map();
    }

    show(message, type = 'success', duration = CONFIG.NOTIFICATION_DURATION) {
        const id = Utils.generateId();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'assertive');
        notification.innerHTML = Utils.escapeHtml(message);
        
        this.container.appendChild(notification);
        this.notifications.set(id, notification);
        
        // 애니메이션을 위한 지연
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // 자동 제거
        if (duration > 0) {
            setTimeout(() => this.hide(id), duration);
        }
        
        return id;
    }

    hide(id) {
        const notification = this.notifications.get(id);
        if (notification) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.notifications.delete(id);
            }, 300);
        }
    }

    clear() {
        this.notifications.forEach((notification, id) => this.hide(id));
    }
}

// ===============================
// 상품 관리
// ===============================
class ProductManager {
    constructor(stateManager, notificationSystem) {
        this.state = stateManager;
        this.notifications = notificationSystem;
        
        // DOM 요소
        this.productGrid = document.querySelector('.product-grid');
        this.loadMoreBtn = document.querySelector('.load-more-btn');
        this.emptyState = document.querySelector('.empty-state');
        this.totalProductsSpan = document.getElementById('total-products');
        
        // 이벤트 리스너 설정
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 상태 변경 구독
        this.state.subscribe('filteredProducts', () => this.render());
        this.state.subscribe('ui.viewMode', () => this.toggleViewMode());
        this.state.subscribe('ui.currentPage', () => this.render());
        
        // 더 보기 버튼
        this.loadMoreBtn?.addEventListener('click', () => this.loadMore());
        
        // 뷰 토글 버튼들
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const viewMode = e.currentTarget.dataset.view;
                this.state.setState({
                    ui: { ...this.state.getState('ui'), viewMode }
                });
            });
        });
        
        // 상품 카드 클릭 이벤트
        this.productGrid?.addEventListener('click', (e) => {
            if (e.target.matches('.add-to-cart-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const productId = parseInt(e.target.dataset.productId);
                this.addToCart(productId);
            } else if (e.target.closest('.product-card')) {
                // 상품 카드 클릭 시 상세페이지 열기
                const productCard = e.target.closest('.product-card');
                const productId = parseInt(productCard.querySelector('.add-to-cart-btn').dataset.productId);
                this.openProductDetail(productId);
            }
        });
    }

    // 상품 데이터 로드
    async loadProducts() {
        this.state.setState({
            ui: { ...this.state.getState('ui'), loading: true }
        });

        try {
            // 실제 API 호출
            const response = await fetch(`${CONFIG.API_BASE_URL}/products`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            const products = result.data ? result.data.products || result.data : result.products || result;
            
            this.state.setState({
                products,
                filteredProducts: products,
                ui: { 
                    ...this.state.getState('ui'), 
                    loading: false,
                    hasMore: false
                }
            });
            
            // 카테고리별 상품 수 업데이트
            this.updateCategoryCounts();
            
        } catch (error) {
            console.error('API 호출 실패, 목업 데이터 사용:', error);
            
            // API 호출 실패 시 목업 데이터 폴백
            try {
                const products = await this.getMockProducts();
                
                this.state.setState({
                    products,
                    filteredProducts: products,
                    ui: { 
                        ...this.state.getState('ui'), 
                        loading: false,
                        hasMore: false
                    }
                });
                
                this.updateCategoryCounts();
                this.renderProducts();
                this.notifications.show('서버 연결 실패로 샘플 데이터를 사용합니다.', 'warning');
                
            } catch (mockError) {
                console.error('목업 데이터 로드 실패:', mockError);
                this.state.setState({
                    ui: { 
                        ...this.state.getState('ui'), 
                        loading: false,
                        error: error.message 
                    }
                });
                this.notifications.show('상품을 불러오는 중 오류가 발생했습니다.', 'error');
            }
        }
    }

    // 목업 상품 데이터 (실제 환경에서는 products.json에서 로드)
    async getMockProducts() {
        try {
            const response = await fetch('data/products.json');
            const data = await response.json();
            return data.products || [];
        } catch (error) {
            console.warn('products.json 로드 실패, 기본 데이터 사용:', error);
            // 기본 데이터 반환
            return [
                {
                    id: 1,
                    name: 'MacBook Pro 14인치',
                    price: 2590000,
                    category: 'electronics',
                    description: 'Apple M3 Pro 칩이 탑재된 강력한 노트북',
                    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop',
                    rating: 4.8,
                    reviewCount: 324,
                    inStock: true,
                    specs: {
                        processor: 'Apple M3 Pro',
                        memory: '16GB',
                        storage: '512GB SSD',
                        display: '14.2인치 Liquid Retina XDR'
                    }
                }
            ];
        }
    }

    // 카테고리별 상품 수 업데이트
    updateCategoryCounts() {
        const products = this.state.getState('products');
        const categoryCounts = products.reduce((counts, product) => {
            counts[product.category] = (counts[product.category] || 0) + 1;
            return counts;
        }, { '': products.length });

        // DOM 업데이트
        document.querySelectorAll('.filter-option .count').forEach(countEl => {
            const option = countEl.closest('.filter-option');
            const input = option.querySelector('input');
            const category = input.value;
            const count = categoryCounts[category] || 0;
            countEl.textContent = `(${count})`;
        });
    }

    // 상품 렌더링
    render() {
        const filteredProducts = this.state.getState('filteredProducts') || [];
        const currentPage = this.state.getState('ui.currentPage') || 1;
        const hasMore = this.state.getState('ui.hasMore');
        
        // 총 상품 수 업데이트
        if (this.totalProductsSpan) {
            this.totalProductsSpan.textContent = filteredProducts.length.toLocaleString();
        }

        // 페이지네이션을 위한 상품 슬라이스
        const displayProducts = filteredProducts.slice(0, currentPage * CONFIG.ITEMS_PER_PAGE);

        if (filteredProducts.length === 0) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();
        
        if (!this.productGrid) return;

        // 상품 카드 HTML 생성
        this.productGrid.innerHTML = displayProducts.map(product => `
            <article class="product-card clickable" role="listitem" tabindex="0" aria-label="${Utils.escapeHtml(product.name)} 상품 상세보기">
                <div class="product-image-container">
                    <img 
                        src="${product.image}" 
                        alt="${Utils.escapeHtml(product.name)}"
                        class="product-image"
                        loading="lazy"
                        onerror="this.src='https://via.placeholder.com/400x400?text=No+Image'"
                    >
                </div>
                <div class="product-info">
                    <h3 class="product-title">${Utils.escapeHtml(product.name)}</h3>
                    <p class="product-price">${Utils.formatCurrency(product.price)}</p>
                    <p class="product-description">${Utils.escapeHtml(product.description)}</p>
                    <button 
                        class="add-to-cart-btn" 
                        data-product-id="${product.id}"
                        aria-label="${Utils.escapeHtml(product.name)} 장바구니에 추가"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="9" cy="21" r="1"/>
                            <circle cx="20" cy="21" r="1"/>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                        </svg>
                        장바구니 담기
                    </button>
                </div>
            </article>
        `).join('');

        // 더 보기 버튼 표시/숨김
        this.updateLoadMoreButton(filteredProducts.length, displayProducts.length);
    }

    // 뷰 모드 토글
    toggleViewMode() {
        const viewMode = this.state.getState('ui.viewMode');
        
        if (this.productGrid) {
            this.productGrid.classList.toggle('list-view', viewMode === 'list');
        }

        // 뷰 버튼 상태 업데이트
        document.querySelectorAll('.view-btn').forEach(btn => {
            const isActive = btn.dataset.view === viewMode;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive.toString());
        });
    }

    // 더 보기 기능
    loadMore() {
        const currentPage = this.state.getState('ui.currentPage');
        this.state.setState({
            ui: { ...this.state.getState('ui'), currentPage: currentPage + 1 }
        });
    }

    // 더 보기 버튼 업데이트
    updateLoadMoreButton(totalCount, displayedCount) {
        if (!this.loadMoreBtn) return;

        const hasMore = displayedCount < totalCount;
        this.loadMoreBtn.style.display = hasMore ? 'block' : 'none';
        
        if (hasMore) {
            const remaining = totalCount - displayedCount;
            this.loadMoreBtn.textContent = `${remaining}개 상품 더 보기`;
        }
    }

    // 빈 상태 표시
    showEmptyState() {
        if (this.productGrid) {
            this.productGrid.style.display = 'none';
        }
        if (this.emptyState) {
            this.emptyState.style.display = 'block';
        }
        if (this.loadMoreBtn) {
            this.loadMoreBtn.style.display = 'none';
        }
    }

    // 빈 상태 숨김
    hideEmptyState() {
        if (this.productGrid) {
            this.productGrid.style.display = 'grid';
        }
        if (this.emptyState) {
            this.emptyState.style.display = 'none';
        }
    }

    // 장바구니 추가
    addToCart(productId) {
        const products = this.state.getState('products');
        const product = products.find(p => p.id === productId);
        
        if (!product) {
            this.notifications.show('상품을 찾을 수 없습니다.', 'error');
            return;
        }

        const cart = this.state.getState('cart');
        const existingItem = cart.find(item => item.id === productId);

        let updatedCart;
        if (existingItem) {
            updatedCart = cart.map(item =>
                item.id === productId
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            );
        } else {
            updatedCart = [...cart, { ...product, quantity: 1 }];
        }

        this.state.setState({ cart: updatedCart });
        this.notifications.show(`${product.name}이(가) 장바구니에 추가되었습니다.`);
        
        // 버튼 시각적 피드백
        const button = document.querySelector(`[data-product-id="${productId}"]`);
        if (button) {
            button.style.transform = 'scale(0.95)';
            setTimeout(() => {
                button.style.transform = '';
            }, 150);
        }
    }

    // 상품 상세페이지 열기
    openProductDetail(productId) {
        const products = this.state.getState('products');
        const product = products.find(p => p.id === productId);
        
        if (!product) {
            this.notifications.show('상품을 찾을 수 없습니다.', 'error');
            return;
        }

        // 상품 상세페이지 모달 열기
        const productDetail = window.shoppingMallApp.productDetailManager;
        if (productDetail) {
            productDetail.openModal(product);
        }
    }
}

// ===============================
// 장바구니 관리
// ===============================
class CartManager {
    constructor(stateManager, notificationSystem) {
        this.state = stateManager;
        this.notifications = notificationSystem;
        
        // DOM 요소
        this.cartSidebar = document.getElementById('shopping-cart');
        this.cartItems = document.querySelector('.cart-items');
        this.emptyCart = document.querySelector('.empty-cart');
        this.cartToggle = document.querySelector('.cart-toggle');
        this.cartClose = document.querySelector('.cart-close');
        this.overlay = document.querySelector('.overlay');
        this.checkoutBtn = document.querySelector('.checkout-btn');
        this.clearCartBtn = document.querySelector('.clear-cart-btn');
        this.continueShoppingBtn = document.querySelector('.continue-shopping-btn');
        
        // 요약 요소들
        this.cartCount = document.getElementById('cart-count');
        this.cartItemCount = document.getElementById('cart-item-count');
        this.shippingCost = document.getElementById('shipping-cost');
        this.cartTotal = document.getElementById('cart-total');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 상태 변경 구독
        this.state.subscribe('cart', () => this.renderCart());
        this.state.subscribe('ui.cartOpen', (isOpen) => this.toggleCartUI(isOpen));
        
        // 장바구니 토글
        this.cartToggle?.addEventListener('click', () => this.toggleCart());
        this.cartClose?.addEventListener('click', () => this.closeCart());
        this.overlay?.addEventListener('click', () => this.closeCart());
        this.continueShoppingBtn?.addEventListener('click', () => this.closeCart());
        
        // 장바구니 액션
        this.checkoutBtn?.addEventListener('click', () => this.checkout());
        this.clearCartBtn?.addEventListener('click', () => this.clearCart());
        
        // 장바구니 아이템 이벤트 (이벤트 위임)
        this.cartItems?.addEventListener('click', (e) => {
            const productId = parseInt(e.target.dataset.productId);
            
            if (e.target.matches('.quantity-btn[data-action="increase"]')) {
                this.updateQuantity(productId, 1);
            } else if (e.target.matches('.quantity-btn[data-action="decrease"]')) {
                this.updateQuantity(productId, -1);
            } else if (e.target.matches('.remove-item-btn')) {
                this.removeFromCart(productId);
            }
        });
        
        // 키보드 접근성
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.state.getState('ui.cartOpen')) {
                this.closeCart();
            }
        });
    }

    // 장바구니 토글
    toggleCart() {
        const isOpen = this.state.getState('ui.cartOpen');
        this.state.setState({
            ui: { ...this.state.getState('ui'), cartOpen: !isOpen }
        });
    }

    // 장바구니 닫기
    closeCart() {
        this.state.setState({
            ui: { ...this.state.getState('ui'), cartOpen: false }
        });
    }

    // 장바구니 UI 토글
    toggleCartUI(isOpen) {
        if (this.cartSidebar) {
            this.cartSidebar.setAttribute('aria-hidden', (!isOpen).toString());
        }
        
        if (this.overlay) {
            this.overlay.setAttribute('aria-hidden', (!isOpen).toString());
        }
        
        if (this.cartToggle) {
            this.cartToggle.setAttribute('aria-expanded', isOpen.toString());
        }
        
        // 포커스 트랩
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            this.cartClose?.focus();
        } else {
            document.body.style.overflow = '';
            this.cartToggle?.focus();
        }
    }

    // 수량 업데이트
    updateQuantity(productId, change) {
        const cart = this.state.getState('cart');
        const item = cart.find(item => item.id === productId);
        
        if (!item) return;
        
        const newQuantity = Math.max(0, item.quantity + change);
        
        if (newQuantity === 0) {
            this.removeFromCart(productId);
        } else {
            const updatedCart = cart.map(item =>
                item.id === productId
                    ? { ...item, quantity: newQuantity }
                    : item
            );
            
            this.state.setState({ cart: updatedCart });
        }
    }

    // 상품 제거
    removeFromCart(productId) {
        const cart = this.state.getState('cart');
        const item = cart.find(item => item.id === productId);
        
        if (item) {
            const updatedCart = cart.filter(item => item.id !== productId);
            this.state.setState({ cart: updatedCart });
            this.notifications.show(`${item.name}이(가) 장바구니에서 제거되었습니다.`, 'info');
        }
    }

    // 장바구니 비우기
    clearCart() {
        if (confirm('장바구니를 비우시겠습니까?')) {
            this.state.setState({ cart: [] });
            this.notifications.show('장바구니가 비워졌습니다.', 'info');
        }
    }

    // 결제 처리
    checkout() {
        const cart = this.state.getState('cart');
        const totals = this.calculateTotals();
        
        if (cart.length === 0) {
            this.notifications.show('장바구니가 비어있습니다.', 'warning');
            return;
        }
        
        // 실제 환경에서는 결제 API 호출
        this.notifications.show(
            `총 ${Utils.formatCurrency(totals.total)} 결제가 진행됩니다. (데모 모드)`,
            'info'
        );
        
        // 데모: 장바구니 비우기
        setTimeout(() => {
            this.state.setState({ cart: [] });
            this.closeCart();
            this.notifications.show('주문이 완료되었습니다! (데모)', 'success');
        }, 1500);
    }

    // 합계 계산
    calculateTotals() {
        const cart = this.state.getState('cart');
        
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const itemCount = cart.reduce((count, item) => count + item.quantity, 0);
        const itemTypes = cart.length;
        
        const shippingCost = subtotal >= CONFIG.SHIPPING_THRESHOLD ? 0 : CONFIG.SHIPPING_COST;
        const total = subtotal + shippingCost;
        
        return {
            subtotal,
            itemCount,
            itemTypes,
            shippingCost,
            total
        };
    }

    // 장바구니 렌더링
    renderCart() {
        const cart = this.state.getState('cart');
        const totals = this.calculateTotals();

        // 카운트 업데이트
        if (this.cartCount) {
            this.cartCount.textContent = totals.itemCount > 0 ? totals.itemCount : '';
            this.cartCount.setAttribute('aria-label', `장바구니에 ${totals.itemCount}개 상품`);
        }

        // 빈 장바구니 처리
        if (cart.length === 0) {
            this.showEmptyCart();
            return;
        }

        this.hideEmptyCart();

        // 장바구니 아이템 렌더링
        if (this.cartItems) {
            this.cartItems.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <img 
                        src="${item.image}" 
                        alt="${Utils.escapeHtml(item.name)}"
                        class="cart-item-image"
                        onerror="this.src='https://via.placeholder.com/80x80?text=No+Image'"
                    >
                    <div class="cart-item-details">
                        <h4 class="cart-item-name">${Utils.escapeHtml(item.name)}</h4>
                        <p class="cart-item-price">${Utils.formatCurrency(item.price)}</p>
                        <div class="quantity-controls">
                            <button 
                                class="quantity-btn" 
                                data-product-id="${item.id}" 
                                data-action="decrease"
                                aria-label="수량 감소"
                                ${item.quantity <= 1 ? 'disabled' : ''}
                            >-</button>
                            <span class="quantity-display" aria-label="${item.quantity}개">${item.quantity}</span>
                            <button 
                                class="quantity-btn" 
                                data-product-id="${item.id}" 
                                data-action="increase"
                                aria-label="수량 증가"
                            >+</button>
                            <button 
                                class="remove-item-btn" 
                                data-product-id="${item.id}"
                                aria-label="${Utils.escapeHtml(item.name)} 제거"
                            >제거</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // 합계 정보 업데이트
        this.updateCartSummary(totals);
    }

    // 장바구니 합계 업데이트
    updateCartSummary(totals) {
        if (this.cartItemCount) {
            this.cartItemCount.textContent = `${totals.itemCount}개`;
        }
        
        if (this.shippingCost) {
            this.shippingCost.textContent = totals.shippingCost === 0 
                ? '무료' 
                : Utils.formatCurrency(totals.shippingCost);
        }
        
        if (this.cartTotal) {
            this.cartTotal.textContent = Utils.formatCurrency(totals.total);
        }
        
        // 결제 버튼 활성화/비활성화
        if (this.checkoutBtn) {
            this.checkoutBtn.disabled = totals.itemCount === 0;
        }
    }

    // 빈 장바구니 표시
    showEmptyCart() {
        if (this.cartItems) {
            this.cartItems.style.display = 'none';
        }
        if (this.emptyCart) {
            this.emptyCart.style.display = 'block';
        }
        if (this.checkoutBtn) {
            this.checkoutBtn.disabled = true;
        }
        
        this.updateCartSummary({
            itemCount: 0,
            itemTypes: 0,
            shippingCost: 0,
            total: 0
        });
    }

    // 빈 장바구니 숨김
    hideEmptyCart() {
        if (this.cartItems) {
            this.cartItems.style.display = 'flex';
        }
        if (this.emptyCart) {
            this.emptyCart.style.display = 'none';
        }
    }

}

// ===============================
// 필터 및 검색 관리
// ===============================
class FilterManager {
    constructor(stateManager) {
        this.state = stateManager;
        
        // DOM 요소
        this.searchInput = document.getElementById('search-input');
        this.categoryInputs = document.querySelectorAll('input[name="category"]');
        this.priceRange = document.getElementById('price-range');
        this.priceRangeValue = document.getElementById('price-range-value');
        this.sortSelect = document.getElementById('sort-select');
        this.resetFiltersBtn = document.querySelector('.reset-filters-btn');
        this.resetSearchBtn = document.querySelector('.reset-search-btn');
        
        // 디바운스된 검색 함수
        this.debouncedSearch = Utils.debounce(this.performSearch.bind(this), CONFIG.DEBOUNCE_DELAY);
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 상태 변경 구독
        this.state.subscribe('filters', () => this.applyFilters());
        this.state.subscribe('products', () => this.applyFilters());
        
        // 검색 입력
        this.searchInput?.addEventListener('input', (e) => {
            this.debouncedSearch(e.target.value);
        });
        
        // 카테고리 필터
        this.categoryInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.updateFilter('category', input.value);
            });
        });
        
        // 가격 범위 필터
        this.priceRange?.addEventListener('input', (e) => {
            const maxPrice = parseInt(e.target.value);
            this.updatePriceRangeDisplay(maxPrice);
            this.updateFilter('maxPrice', maxPrice);
        });
        
        // 정렬 선택
        this.sortSelect?.addEventListener('change', (e) => {
            this.updateFilter('sortBy', e.target.value);
        });
        
        // 필터 초기화
        this.resetFiltersBtn?.addEventListener('click', () => this.resetFilters());
        this.resetSearchBtn?.addEventListener('click', () => this.resetSearch());
    }

    // 검색 수행
    performSearch(query) {
        this.updateFilter('search', query.trim());
    }

    // 필터 업데이트
    updateFilter(key, value) {
        const currentFilters = this.state.getState('filters');
        this.state.setState({
            filters: { ...currentFilters, [key]: value },
            ui: { ...this.state.getState('ui'), currentPage: 1 }
        });
    }

    // 가격 범위 표시 업데이트
    updatePriceRangeDisplay(maxPrice) {
        if (this.priceRangeValue) {
            this.priceRangeValue.textContent = maxPrice === CONFIG.MAX_PRICE 
                ? '제한 없음'
                : `${Utils.formatCurrency(maxPrice)} 이하`;
        }
    }

    // 필터 적용
    applyFilters() {
        const products = this.state.getState('products') || [];
        const filters = this.state.getState('filters');
        
        let filtered = products.filter(product => {
            // 카테고리 필터
            if (filters.category && product.category !== filters.category) {
                return false;
            }
            
            // 가격 필터
            if (product.price > filters.maxPrice) {
                return false;
            }
            
            // 검색 필터
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                const searchFields = [
                    product.name,
                    product.description,
                    product.category
                ].join(' ').toLowerCase();
                
                if (!searchFields.includes(searchTerm)) {
                    return false;
                }
            }
            
            return true;
        });
        
        // 정렬 적용
        filtered = this.sortProducts(filtered, filters.sortBy);
        
        this.state.setState({ filteredProducts: filtered });
    }

    // 상품 정렬
    sortProducts(products, sortBy) {
        const sortedProducts = [...products];
        
        switch (sortBy) {
            case 'price-low':
                return sortedProducts.sort((a, b) => a.price - b.price);
            case 'price-high':
                return sortedProducts.sort((a, b) => b.price - a.price);
            case 'name':
                return sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
            case 'newest':
                return sortedProducts.sort((a, b) => b.id - a.id);
            case 'relevance':
            default:
                return sortedProducts;
        }
    }

    // 필터 초기화
    resetFilters() {
        const defaultFilters = {
            category: '',
            maxPrice: CONFIG.MAX_PRICE,
            search: '',
            sortBy: 'relevance'
        };
        
        this.state.setState({
            filters: defaultFilters,
            ui: { ...this.state.getState('ui'), currentPage: 1 }
        });
        
        // UI 초기화
        if (this.searchInput) this.searchInput.value = '';
        if (this.priceRange) this.priceRange.value = CONFIG.MAX_PRICE;
        if (this.sortSelect) this.sortSelect.value = 'relevance';
        
        this.categoryInputs.forEach(input => {
            input.checked = input.value === '';
        });
        
        this.updatePriceRangeDisplay(CONFIG.MAX_PRICE);
    }

    // 검색 초기화
    resetSearch() {
        this.updateFilter('search', '');
        if (this.searchInput) {
            this.searchInput.value = '';
            this.searchInput.focus();
        }
    }
}

// ===============================
// 상품 상세페이지 관리
// ===============================
class ProductDetailManager {
    constructor(stateManager, notificationSystem) {
        this.state = stateManager;
        this.notifications = notificationSystem;
        
        // DOM 요소
        this.modal = document.getElementById('product-detail-modal');
        this.closeBtn = document.querySelector('.product-detail-close');
        this.mainImage = document.getElementById('product-main-image');
        this.thumbnailList = document.querySelector('.product-thumbnail-list');
        this.categoryBadge = document.querySelector('.product-category-badge');
        this.ratingStars = document.querySelector('.rating-stars');
        this.ratingCount = document.querySelector('.rating-count');
        this.productName = document.getElementById('product-detail-title');
        this.currentPrice = document.querySelector('.product-current-price');
        this.originalPrice = document.querySelector('.product-original-price');
        this.discountBadge = document.querySelector('.product-discount-badge');
        this.description = document.querySelector('.product-detailed-description');
        this.specsList = document.querySelector('.product-specs-list');
        this.quantityInput = document.getElementById('detail-quantity-input');
        this.quantityBtns = document.querySelectorAll('.product-detail-modal .quantity-btn');
        this.addToCartBtn = document.querySelector('.product-detail-modal .add-to-cart-btn');
        this.buyNowBtn = document.querySelector('.buy-now-btn');

        this.currentProduct = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 모달 닫기 이벤트
        this.closeBtn?.addEventListener('click', () => this.closeModal());
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // 키보드 접근성
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isModalOpen()) {
                this.closeModal();
            }
        });

        // 수량 조절 버튼
        this.quantityBtns?.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.adjustQuantity(action);
            });
        });

        // 수량 입력 필드
        this.quantityInput?.addEventListener('change', () => {
            this.validateQuantity();
        });

        // 장바구니 담기 버튼
        this.addToCartBtn?.addEventListener('click', () => {
            this.addToCart();
        });

        // 바로 구매 버튼
        this.buyNowBtn?.addEventListener('click', () => {
            this.buyNow();
        });

        // 썸네일 클릭
        this.thumbnailList?.addEventListener('click', (e) => {
            const thumbnail = e.target.closest('.product-thumbnail');
            if (thumbnail) {
                this.changeMainImage(thumbnail.dataset.imageUrl);
                this.setActiveThumbnail(thumbnail);
            }
        });
    }

    // 모달 열기
    openModal(product) {
        this.currentProduct = product;
        this.renderProductDetail();
        this.showModal();
    }

    // 모달 닫기
    closeModal() {
        this.hideModal();
        this.currentProduct = null;
    }

    // 모달이 열려있는지 확인
    isModalOpen() {
        return this.modal && this.modal.getAttribute('aria-hidden') === 'false';
    }

    // 모달 표시
    showModal() {
        if (this.modal) {
            this.modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            
            // 포커스 이동
            setTimeout(() => {
                this.closeBtn?.focus();
            }, 100);
        }
    }

    // 모달 숨김
    hideModal() {
        if (this.modal) {
            this.modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
    }

    // 상품 상세 정보 렌더링
    renderProductDetail() {
        if (!this.currentProduct) return;

        const product = this.currentProduct;

        // 카테고리 뱃지
        if (this.categoryBadge) {
            const categoryMap = {
                'electronics': '전자제품',
                'clothing': '의류',
                'books': '도서',
                'home': '생활용품'
            };
            this.categoryBadge.textContent = categoryMap[product.category] || product.category;
        }

        // 평점 렌더링
        this.renderRating(product.rating || 0, product.reviewCount || 0);

        // 상품명
        if (this.productName) {
            this.productName.textContent = product.name;
        }

        // 가격 정보
        this.renderPriceInfo(product);

        // 상품 설명
        if (this.description) {
            this.description.textContent = product.description;
        }

        // 상품 사양
        this.renderSpecs(product.specs || {});

        // 메인 이미지
        if (this.mainImage && product.image) {
            this.mainImage.src = product.image;
            this.mainImage.alt = product.name;
        }

        // 썸네일 (현재는 메인 이미지만 사용)
        this.renderThumbnails([product.image]);

        // 장바구니 버튼에 상품 ID 설정
        if (this.addToCartBtn) {
            this.addToCartBtn.dataset.productId = product.id;
        }

        // 수량 초기화
        if (this.quantityInput) {
            this.quantityInput.value = 1;
        }
    }

    // 평점 렌더링
    renderRating(rating, reviewCount) {
        if (!this.ratingStars) return;

        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let starsHTML = '';
        
        // 가득찬 별
        for (let i = 0; i < fullStars; i++) {
            starsHTML += `<svg class="rating-star" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>`;
        }

        // 반별 (현재는 구현하지 않음)
        
        // 빈 별
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += `<svg class="rating-star empty" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>`;
        }

        this.ratingStars.innerHTML = starsHTML;

        // 리뷰 수
        if (this.ratingCount) {
            this.ratingCount.textContent = `(${reviewCount.toLocaleString()}개 리뷰)`;
        }
    }

    // 가격 정보 렌더링
    renderPriceInfo(product) {
        if (this.currentPrice) {
            this.currentPrice.textContent = Utils.formatCurrency(product.price);
        }

        // 할인 정보가 있는 경우
        if (product.originalPrice && product.originalPrice > product.price) {
            if (this.originalPrice) {
                this.originalPrice.textContent = Utils.formatCurrency(product.originalPrice);
                this.originalPrice.style.display = 'block';
            }

            if (this.discountBadge) {
                const discountRate = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
                this.discountBadge.textContent = `-${discountRate}%`;
                this.discountBadge.style.display = 'block';
            }
        } else {
            if (this.originalPrice) {
                this.originalPrice.style.display = 'none';
            }
            if (this.discountBadge) {
                this.discountBadge.style.display = 'none';
            }
        }
    }

    // 상품 사양 렌더링
    renderSpecs(specs) {
        if (!this.specsList || !specs || Object.keys(specs).length === 0) {
            if (this.specsList) {
                this.specsList.parentElement.style.display = 'none';
            }
            return;
        }

        if (this.specsList.parentElement) {
            this.specsList.parentElement.style.display = 'block';
        }

        this.specsList.innerHTML = Object.entries(specs).map(([key, value]) => `
            <div class="product-spec-item">
                <dt class="product-spec-label">${Utils.escapeHtml(key)}</dt>
                <dd class="product-spec-value">${Utils.escapeHtml(Array.isArray(value) ? value.join(', ') : String(value))}</dd>
            </div>
        `).join('');
    }

    // 썸네일 렌더링
    renderThumbnails(images) {
        if (!this.thumbnailList || !images || images.length === 0) {
            return;
        }

        this.thumbnailList.innerHTML = images.map((image, index) => `
            <div class="product-thumbnail ${index === 0 ? 'active' : ''}" data-image-url="${image}">
                <img src="${image}" alt="상품 이미지 ${index + 1}" />
            </div>
        `).join('');
    }

    // 메인 이미지 변경
    changeMainImage(imageUrl) {
        if (this.mainImage) {
            this.mainImage.src = imageUrl;
        }
    }

    // 활성 썸네일 설정
    setActiveThumbnail(activeThumbnail) {
        const thumbnails = this.thumbnailList?.querySelectorAll('.product-thumbnail');
        thumbnails?.forEach(thumb => thumb.classList.remove('active'));
        activeThumbnail?.classList.add('active');
    }

    // 수량 조절
    adjustQuantity(action) {
        if (!this.quantityInput) return;

        let currentValue = parseInt(this.quantityInput.value) || 1;
        
        if (action === 'increase') {
            currentValue++;
        } else if (action === 'decrease' && currentValue > 1) {
            currentValue--;
        }

        this.quantityInput.value = currentValue;
        this.validateQuantity();
    }

    // 수량 유효성 검사
    validateQuantity() {
        if (!this.quantityInput) return;

        let value = parseInt(this.quantityInput.value) || 1;
        value = Math.max(1, Math.min(99, value)); // 1-99 사이로 제한
        this.quantityInput.value = value;

        // 감소 버튼 비활성화 상태 업데이트
        const decreaseBtn = document.querySelector('.product-detail-modal .quantity-btn[data-action="decrease"]');
        if (decreaseBtn) {
            decreaseBtn.disabled = value <= 1;
        }
    }

    // 장바구니에 추가
    addToCart() {
        if (!this.currentProduct) return;

        const quantity = parseInt(this.quantityInput?.value) || 1;
        const cart = this.state.getState('cart');
        const existingItem = cart.find(item => item.id === this.currentProduct.id);

        let updatedCart;
        if (existingItem) {
            updatedCart = cart.map(item =>
                item.id === this.currentProduct.id
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
            );
        } else {
            updatedCart = [...cart, { ...this.currentProduct, quantity }];
        }

        this.state.setState({ cart: updatedCart });
        this.notifications.show(
            `${this.currentProduct.name} ${quantity}개가 장바구니에 추가되었습니다.`
        );

        // 버튼 피드백
        if (this.addToCartBtn) {
            this.addToCartBtn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.addToCartBtn.style.transform = '';
            }, 150);
        }
    }

    // 바로 구매
    buyNow() {
        this.addToCart();
        
        // 장바구니 열기
        this.state.setState({
            ui: { ...this.state.getState('ui'), cartOpen: true }
        });
        
        this.closeModal();
    }
}

// ===============================
// 메인 애플리케이션 클래스
// ===============================
class ShoppingMallApp {
    constructor() {
        // 핵심 시스템 초기화
        this.stateManager = new StateManager();
        this.notificationSystem = new NotificationSystem();
        
        // 매니저 초기화
        this.productManager = new ProductManager(this.stateManager, this.notificationSystem);
        this.cartManager = new CartManager(this.stateManager, this.notificationSystem);
        this.filterManager = new FilterManager(this.stateManager);
        this.productDetailManager = new ProductDetailManager(this.stateManager, this.notificationSystem);
        
        // 전역 접근을 위한 설정 (개발/디버깅용)
        if (typeof window !== 'undefined') {
            window.shoppingMallApp = this;
            window.state = this.stateManager;
        }
        
        this.init();
    }

    async init() {
        try {
            // 로딩 화면 표시
            this.showLoading();
            
            // 기본 이벤트 리스너 설정
            this.setupGlobalEventListeners();
            
            // 상품 데이터 로드
            await this.productManager.loadProducts();
            
            // 접근성 기능 초기화
            this.initializeAccessibility();
            
            // 성능 모니터링 시작
            this.startPerformanceMonitoring();
            
            console.log('쇼핑몰 앱이 성공적으로 초기화되었습니다.');
            
        } catch (error) {
            console.error('앱 초기화 실패:', error);
            this.notificationSystem.show('앱을 초기화하는 중 오류가 발생했습니다.', 'error');
        } finally {
            // 로딩 화면 숨김
            this.hideLoading();
        }
    }

    // 로딩 화면 표시
    showLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
    }

    // 로딩 화면 숨김
    hideLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
            }, 500);
        }
    }

    // 전역 이벤트 리스너 설정
    setupGlobalEventListeners() {
        // 페이지 언로드 시 상태 저장
        window.addEventListener('beforeunload', () => {
            this.stateManager.saveToStorage();
        });

        // 온라인/오프라인 상태 감지
        window.addEventListener('online', () => {
            this.notificationSystem.show('인터넷 연결이 복구되었습니다.', 'success');
        });

        window.addEventListener('offline', () => {
            this.notificationSystem.show('인터넷 연결이 끊어졌습니다.', 'warning');
        });

        // 에러 핸들링
        window.addEventListener('error', (e) => {
            console.error('전역 에러:', e.error);
        });

        // 미처리된 Promise 거부
        window.addEventListener('unhandledrejection', (e) => {
            console.error('처리되지 않은 Promise 거부:', e.reason);
        });
    }

    // 접근성 기능 초기화
    initializeAccessibility() {
        // 키보드 네비게이션
        document.addEventListener('keydown', (e) => {
            // Tab 트래핑 (모달이 열려있을 때)
            if (this.stateManager.getState('ui.cartOpen')) {
                this.handleTabTrapping(e);
            }
        });

        // 포커스 관리
        this.setupFocusManagement();
    }

    // Tab 트래핑 처리
    handleTabTrapping(e) {
        if (e.key !== 'Tab') return;

        const cart = document.getElementById('shopping-cart');
        if (!cart || cart.getAttribute('aria-hidden') === 'true') return;

        const focusableElements = cart.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    // 포커스 관리 설정
    setupFocusManagement() {
        // 클릭 시 포커스 스타일 제거
        document.addEventListener('mousedown', () => {
            document.body.classList.add('mouse-user');
        });

        // 키보드 사용 시 포커스 스타일 복원
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.remove('mouse-user');
            }
        });
    }

    // 성능 모니터링 시작
    startPerformanceMonitoring() {
        // 메모리 사용량 모니터링 (개발 환경에서만)
        if (window.location.hostname === 'localhost') {
            setInterval(() => {
                if (performance.memory) {
                    const memInfo = {
                        used: Math.round(performance.memory.usedJSHeapSize / 1048576),
                        total: Math.round(performance.memory.totalJSHeapSize / 1048576),
                        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
                    };
                    console.log('메모리 사용량:', memInfo);
                }
            }, 30000); // 30초마다
        }

        // 성능 메트릭 수집
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (entry.entryType === 'navigation') {
                        console.log('페이지 로드 시간:', Math.round(entry.loadEventEnd));
                    }
                });
            });
            
            try {
                observer.observe({ entryTypes: ['navigation', 'paint'] });
            } catch (e) {
                // 브라우저가 지원하지 않는 경우 무시
            }
        }
    }

    // 앱 상태 리셋 (개발/디버깅용)
    reset() {
        this.stateManager.resetState();
        this.notificationSystem.clear();
        this.notificationSystem.show('앱이 초기화되었습니다.', 'info');
        
        // 페이지 새로고침
        setTimeout(() => {
            location.reload();
        }, 1000);
    }

    // 앱 통계 정보 반환
    getStats() {
        const products = this.stateManager.getState('products');
        const cart = this.stateManager.getState('cart');
        const filteredProducts = this.stateManager.getState('filteredProducts');
        
        return {
            totalProducts: products.length,
            filteredProducts: filteredProducts.length,
            cartItems: cart.length,
            cartValue: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            performanceMetrics: this.stateManager.getPerformanceMetrics()
        };
    }
}

// ===============================
// 앱 시작
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    // 앱 인스턴스 생성
    const app = new ShoppingMallApp();
    
    // 콘솔에 도움말 출력
    console.log(`
🛒 간단한 쇼핑몰 프론트엔드
============================
개발자 도구:
- window.shoppingMallApp: 메인 앱 인스턴스
- window.state: 상태 관리자
- app.getStats(): 앱 통계 정보
- app.reset(): 앱 초기화

성능 최적화:
- 이미지 지연 로딩
- 상태 기반 렌더링
- 디바운스된 검색
- 로컬 스토리지 캐싱

접근성 기능:
- WCAG 2.1 AA 준수
- 키보드 네비게이션
- 스크린 리더 지원
- 고대비 모드 지원
    `);
});

// Service Worker 등록 (PWA 기능)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            // 실제 환경에서는 service-worker.js 파일 필요
            // const registration = await navigator.serviceWorker.register('/service-worker.js');
            // console.log('ServiceWorker registered:', registration);
        } catch (error) {
            console.log('ServiceWorker registration failed:', error);
        }
    });
}