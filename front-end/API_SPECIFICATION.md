# 🛒 쇼핑몰 백엔드 API 명세서

간단한 쇼핑몰 프론트엔드와 연동하기 위한 백엔드 API 완전 명세서입니다.

## 📋 목차

1. [API 개요](#api-개요)
2. [서버 상태 확인 API](#서버-상태-확인-api)
3. [인증 및 보안](#인증-및-보안)
4. [상품 관리 API](#상품-관리-api)
5. [카테고리 API](#카테고리-api)
6. [장바구니 API](#장바구니-api)
7. [주문 API](#주문-api)
8. [검색 및 필터 API](#검색-및-필터-api)
9. [에러 처리](#에러-처리)
10. [프론트엔드 연동 가이드](#프론트엔드-연동-가이드)

---

## API 개요

### 기본 정보
- **Base URL**: `https://your-domain.com/api`
- **API Version**: `v1`
- **Content-Type**: `application/json`
- **Character Encoding**: `UTF-8`
- **Date Format**: ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`)

### HTTP 상태 코드
- `200 OK` - 요청 성공
- `201 Created` - 리소스 생성 성공
- `400 Bad Request` - 잘못된 요청
- `401 Unauthorized` - 인증 필요
- `403 Forbidden` - 권한 없음
- `404 Not Found` - 리소스 없음
- `422 Unprocessable Entity` - 유효성 검사 실패
- `500 Internal Server Error` - 서버 오류

### 표준 응답 형식
```json
{
  "success": true,
  "data": {},
  "message": "요청이 성공했습니다.",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req_1234567890"
}
```

---

## 서버 상태 확인 API

### Health Check - 서버 상태 체크

**프론트엔드 호출 위치**: `health-check.html` 페이지, 자동 모니터링

```http
GET /api/health
```

#### 용도
- 백엔드 서버 가동 상태 확인
- API 서버 응답성 테스트
- 시스템 상태 모니터링
- 프론트엔드와 백엔드 간 연결 확인

#### 응답 예시 (정상)
```
1
```

#### Content-Type
- `text/plain`

#### 상태 코드
- `200 OK` - 서버 정상 (응답: "1")
- `500 Internal Server Error` - 서버 오류

#### Health Check 페이지 연동
Health Check 페이지(`health-check.html`)에서는 다음과 같이 활용됩니다:

1. **자동 상태 체크**: 30초마다 자동으로 서버 상태 확인
2. **실시간 모니터링**: 서버 응답 시간 및 상태 표시
3. **전체 API 테스트**: 주요 API 엔드포인트 일괄 확인
4. **연결 진단**: 네트워크 및 CORS 설정 검증

#### 프론트엔드 구현 예시
```javascript
// health-check.html에서 사용하는 함수
async function checkServerHealth() {
    try {
        const startTime = performance.now();
        
        const response = await fetch(`${API_BASE_URL}/api/health`, {
            method: 'GET',
            headers: {
                'Accept': 'text/plain'
            },
            signal: AbortSignal.timeout(10000) // 10초 타임아웃
        });

        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);

        if (response.ok) {
            const text = await response.text();
            if (text === "1") {
                updateStatus('online', `서버 연결 성공 (${responseTime}ms)`, {
                    status: 'healthy',
                    responseTime: `${responseTime}ms`,
                    timestamp: new Date().toISOString(),
                    message: text
                });
            } else {
                throw new Error(`Unexpected response: ${text}`);
            }
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
    } catch (error) {
        console.error('서버 연결 실패:', error);
        updateStatus('offline', '서버에 연결할 수 없습니다', null, error);
    }
}
```

#### 모니터링 권장사항
- **자동 체크 간격**: 30초 (운영환경에서는 5분 권장)
- **타임아웃 설정**: 10초 이내 응답
- **실패 임계치**: 3회 연속 실패 시 알림
- **응답시간 목표**: 200ms 이내 (정상), 500ms 이상 (경고)

---

## 인증 및 보안

### 인증 헤더 (선택사항)
```http
Authorization: Bearer <access_token>
```

### CORS 설정
```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## 상품 관리 API

### 1. 상품 목록 조회

**프론트엔드 호출 위치**: `ProductManager.loadProducts()`

```http
GET /api/products
```

#### 쿼리 파라미터 (선택사항)
| 파라미터 | 타입 | 설명 | 기본값 | 예시 |
|---------|------|------|--------|------|
| `page` | integer | 페이지 번호 | 1 | `?page=2` |
| `limit` | integer | 페이지당 아이템 수 | 20 | `?limit=10` |
| `category` | string | 카테고리 필터 | - | `?category=electronics` |
| `search` | string | 검색 키워드 | - | `?search=노트북` |
| `minPrice` | number | 최소 가격 | 0 | `?minPrice=100000` |
| `maxPrice` | number | 최대 가격 | - | `?maxPrice=500000` |
| `sortBy` | string | 정렬 기준 | relevance | `?sortBy=price-low` |
| `inStock` | boolean | 재고 있는 상품만 | false | `?inStock=true` |

#### 정렬 옵션 (`sortBy`)
- `relevance` - 관련도순 (기본값)
- `price-low` - 가격 낮은순
- `price-high` - 가격 높은순  
- `name` - 이름순 (가나다순)
- `newest` - 최신순
- `rating` - 평점순
- `popular` - 인기순

#### 응답 예시
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "name": "MacBook Pro 14인치",
        "price": 2590000,
        "originalPrice": null,
        "discountRate": 0,
        "category": "electronics",
        "description": "Apple M3 Pro 칩이 탑재된 강력한 노트북",
        "image": "https://cdn.example.com/products/macbook-pro-14.jpg",
        "images": [
          "https://cdn.example.com/products/macbook-pro-14-1.jpg",
          "https://cdn.example.com/products/macbook-pro-14-2.jpg"
        ],
        "rating": 4.8,
        "reviewCount": 324,
        "inStock": true,
        "stockCount": 15,
        "tags": ["laptop", "apple", "professional", "m3"],
        "specs": {
          "processor": "Apple M3 Pro",
          "memory": "16GB",
          "storage": "512GB SSD",
          "display": "14.2인치 Liquid Retina XDR"
        },
        "createdAt": "2024-01-10T09:00:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 95,
      "itemsPerPage": 20,
      "hasNext": true,
      "hasPrev": false
    },
    "filters": {
      "categories": [
        {
          "id": "electronics",
          "name": "전자제품",
          "count": 25
        },
        {
          "id": "clothing",
          "name": "의류",
          "count": 30
        }
      ],
      "priceRange": {
        "min": 0,
        "max": 5000000
      }
    }
  },
  "message": "상품 목록을 성공적으로 조회했습니다."
}
```

### 2. 단일 상품 상세 조회

```http
GET /api/products/{id}
```

#### 응답 예시
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "MacBook Pro 14인치",
    "price": 2590000,
    "originalPrice": 2790000,
    "discountRate": 7.2,
    "category": "electronics",
    "description": "Apple M3 Pro 칩이 탑재된 강력한 노트북으로 전문가급 성능을 제공합니다. 뛰어난 성능과 긴 배터리 수명을 자랑합니다.",
    "image": "https://cdn.example.com/products/macbook-pro-14.jpg",
    "images": [
      "https://cdn.example.com/products/macbook-pro-14-1.jpg",
      "https://cdn.example.com/products/macbook-pro-14-2.jpg",
      "https://cdn.example.com/products/macbook-pro-14-3.jpg"
    ],
    "rating": 4.8,
    "reviewCount": 324,
    "inStock": true,
    "stockCount": 15,
    "tags": ["laptop", "apple", "professional", "m3"],
    "specs": {
      "processor": "Apple M3 Pro",
      "memory": "16GB",
      "storage": "512GB SSD",
      "display": "14.2인치 Liquid Retina XDR",
      "weight": "1.6kg",
      "battery": "최대 18시간"
    },
    "options": [
      {
        "name": "메모리",
        "values": ["16GB", "32GB"],
        "priceAdd": [0, 800000]
      },
      {
        "name": "저장용량",
        "values": ["512GB", "1TB", "2TB"],
        "priceAdd": [0, 500000, 1300000]
      }
    ],
    "shipping": {
      "free": true,
      "estimatedDays": 2,
      "methods": ["일반배송", "익일배송"]
    },
    "relatedProducts": [2, 7, 11],
    "createdAt": "2024-01-10T09:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "상품 상세정보를 성공적으로 조회했습니다."
}
```

---

## 카테고리 API

### 1. 카테고리 목록 조회

**프론트엔드 호출 위치**: 필터 시스템, 카테고리 카운트 업데이트

```http
GET /api/categories
```

#### 응답 예시
```json
{
  "success": true,
  "data": [
    {
      "id": "electronics",
      "name": "전자제품",
      "description": "최신 전자기기 및 IT 제품",
      "icon": "📱",
      "productCount": 25,
      "featured": true,
      "subcategories": [
        {
          "id": "smartphones",
          "name": "스마트폰",
          "productCount": 8
        },
        {
          "id": "laptops",
          "name": "노트북",
          "productCount": 12
        }
      ]
    },
    {
      "id": "clothing",
      "name": "의류",
      "description": "패션 의류 및 액세서리",
      "icon": "👕",
      "productCount": 30,
      "featured": true,
      "subcategories": [
        {
          "id": "outerwear",
          "name": "아우터",
          "productCount": 15
        },
        {
          "id": "casual",
          "name": "캐주얼",
          "productCount": 15
        }
      ]
    },
    {
      "id": "books",
      "name": "도서",
      "description": "프로그래밍 및 기술 서적",
      "icon": "📚",
      "productCount": 20,
      "featured": false
    },
    {
      "id": "home",
      "name": "생활용품",
      "description": "홈 & 리빙 용품",
      "icon": "🏠",
      "productCount": 20,
      "featured": false
    }
  ],
  "message": "카테고리 목록을 성공적으로 조회했습니다."
}
```

---

## 장바구니 API

### 1. 장바구니 조회

**프론트엔드 호출 위치**: 페이지 로드 시, 장바구니 동기화

```http
GET /api/cart
```

#### 헤더 (사용자 식별용)
```http
Authorization: Bearer <token>
# 또는
X-Session-ID: <session_id>
# 또는
X-Guest-ID: <guest_uuid>
```

#### 응답 예시
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "cart_item_123",
        "productId": 1,
        "product": {
          "id": 1,
          "name": "MacBook Pro 14인치",
          "price": 2590000,
          "image": "https://cdn.example.com/products/macbook-pro-14.jpg",
          "inStock": true,
          "stockCount": 15
        },
        "quantity": 2,
        "selectedOptions": {
          "memory": "32GB",
          "storage": "1TB"
        },
        "unitPrice": 3890000,
        "totalPrice": 7780000,
        "addedAt": "2024-01-15T10:15:00.000Z"
      }
    ],
    "summary": {
      "itemCount": 3,
      "uniqueItemCount": 2,
      "subtotal": 8560000,
      "shippingCost": 0,
      "shippingThreshold": 50000,
      "discount": 0,
      "total": 8560000,
      "estimatedDelivery": "2024-01-17T18:00:00.000Z"
    },
    "shippingOptions": [
      {
        "id": "standard",
        "name": "일반배송",
        "cost": 0,
        "estimatedDays": 2
      },
      {
        "id": "express",
        "name": "익일배송",
        "cost": 5000,
        "estimatedDays": 1
      }
    ]
  },
  "message": "장바구니를 성공적으로 조회했습니다."
}
```

### 2. 장바구니 상품 추가

**프론트엔드 호출 위치**: `CartManager.addToCart()`

```http
POST /api/cart/items
```

#### 요청 본문
```json
{
  "productId": 1,
  "quantity": 2,
  "options": {
    "memory": "32GB",
    "storage": "1TB"
  }
}
```

#### 응답 예시
```json
{
  "success": true,
  "data": {
    "cartItem": {
      "id": "cart_item_124",
      "productId": 1,
      "quantity": 2,
      "unitPrice": 3890000,
      "totalPrice": 7780000,
      "addedAt": "2024-01-15T10:30:00.000Z"
    },
    "cartSummary": {
      "itemCount": 5,
      "uniqueItemCount": 3,
      "subtotal": 16340000,
      "total": 16340000
    }
  },
  "message": "상품이 장바구니에 추가되었습니다."
}
```

### 3. 장바구니 수량 수정

**프론트엔드 호출 위치**: `CartManager.updateQuantity()`

```http
PUT /api/cart/items/{cart_item_id}
```

#### 요청 본문
```json
{
  "quantity": 3
}
```

#### 응답 예시
```json
{
  "success": true,
  "data": {
    "cartItem": {
      "id": "cart_item_123",
      "quantity": 3,
      "totalPrice": 11670000
    },
    "cartSummary": {
      "itemCount": 6,
      "subtotal": 20230000,
      "total": 20230000
    }
  },
  "message": "수량이 수정되었습니다."
}
```

### 4. 장바구니 상품 삭제

**프론트엔드 호출 위치**: `CartManager.removeFromCart()`

```http
DELETE /api/cart/items/{cart_item_id}
```

#### 응답 예시
```json
{
  "success": true,
  "data": {
    "removedItemId": "cart_item_123",
    "cartSummary": {
      "itemCount": 3,
      "subtotal": 8560000,
      "total": 8560000
    }
  },
  "message": "상품이 장바구니에서 삭제되었습니다."
}
```

### 5. 장바구니 비우기

**프론트엔드 호출 위치**: `CartManager.clearCart()`

```http
DELETE /api/cart
```

#### 응답 예시
```json
{
  "success": true,
  "data": {
    "clearedItemCount": 5
  },
  "message": "장바구니가 비워졌습니다."
}
```

---

## 주문 API

### 1. 주문 생성 (결제)

**프론트엔드 호출 위치**: `CartManager.checkout()`

```http
POST /api/orders
```

#### 요청 본문
```json
{
  "cartItems": [
    {
      "cartItemId": "cart_item_123",
      "productId": 1,
      "quantity": 2,
      "options": {
        "memory": "32GB",
        "storage": "1TB"
      }
    }
  ],
  "shippingAddress": {
    "name": "홍길동",
    "phone": "010-1234-5678",
    "zipCode": "12345",
    "address": "서울시 강남구 테헤란로 123",
    "detailAddress": "456호"
  },
  "paymentMethod": {
    "type": "card",
    "cardNumber": "****-****-****-1234",
    "installment": 0
  },
  "shippingOption": {
    "id": "standard",
    "cost": 0
  },
  "couponCode": null,
  "memo": "부재 시 문앞에 놓아주세요"
}
```

#### 응답 예시
```json
{
  "success": true,
  "data": {
    "orderId": "ORDER_20240115_001",
    "orderNumber": "241501234567",
    "status": "payment_pending",
    "items": [
      {
        "productId": 1,
        "productName": "MacBook Pro 14인치",
        "quantity": 2,
        "unitPrice": 3890000,
        "totalPrice": 7780000
      }
    ],
    "summary": {
      "subtotal": 7780000,
      "shippingCost": 0,
      "discount": 0,
      "total": 7780000
    },
    "payment": {
      "method": "card",
      "status": "pending",
      "paymentUrl": "https://payment.example.com/pay/xyz123",
      "expiresAt": "2024-01-15T11:00:00.000Z"
    },
    "shipping": {
      "method": "standard",
      "estimatedDelivery": "2024-01-17T18:00:00.000Z"
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "주문이 생성되었습니다. 결제를 진행해주세요."
}
```

### 2. 주문 상태 조회

```http
GET /api/orders/{order_id}
```

#### 응답 예시
```json
{
  "success": true,
  "data": {
    "orderId": "ORDER_20240115_001",
    "orderNumber": "241501234567",
    "status": "shipped",
    "statusHistory": [
      {
        "status": "payment_completed",
        "timestamp": "2024-01-15T10:35:00.000Z",
        "message": "결제가 완료되었습니다."
      },
      {
        "status": "processing",
        "timestamp": "2024-01-15T11:00:00.000Z",
        "message": "상품 준비 중입니다."
      },
      {
        "status": "shipped",
        "timestamp": "2024-01-16T14:00:00.000Z",
        "message": "상품이 발송되었습니다."
      }
    ],
    "tracking": {
      "carrier": "CJ대한통운",
      "trackingNumber": "123456789012",
      "trackingUrl": "https://www.doortodoor.co.kr/parcel/doortodoor.do?fsp_action=PARC_ACT_002&fsp_cmd=retrieveInvNoACT&invc_no=123456789012"
    },
    "estimatedDelivery": "2024-01-17T18:00:00.000Z"
  },
  "message": "주문 정보를 성공적으로 조회했습니다."
}
```

---

## 검색 및 필터 API

### 1. 검색 자동완성

**프론트엔드 호출 위치**: 검색창 입력 시

```http
GET /api/search/suggestions
```

#### 쿼리 파라미터
| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|---------|------|------|------|------|
| `q` | string | ✓ | 검색 키워드 | `?q=맥북` |
| `limit` | integer | ✗ | 결과 개수 | `?limit=5` |

#### 응답 예시
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "text": "맥북 프로",
        "type": "product",
        "count": 8
      },
      {
        "text": "맥북 에어",
        "type": "product", 
        "count": 5
      },
      {
        "text": "맥북 케이스",
        "type": "product",
        "count": 12
      }
    ],
    "categories": [
      {
        "id": "electronics",
        "name": "전자제품",
        "matchCount": 15
      }
    ],
    "popularSearches": [
      "아이폰 15",
      "에어팟 프로",
      "갤럭시"
    ]
  },
  "message": "검색 제안을 성공적으로 조회했습니다."
}
```

### 2. 인기 검색어

```http
GET /api/search/popular
```

#### 응답 예시
```json
{
  "success": true,
  "data": {
    "keywords": [
      {
        "rank": 1,
        "keyword": "아이폰 15",
        "searchCount": 1250,
        "trend": "up"
      },
      {
        "rank": 2,
        "keyword": "맥북 프로",
        "searchCount": 980,
        "trend": "same"
      },
      {
        "rank": 3,
        "keyword": "에어팟",
        "searchCount": 756,
        "trend": "down"
      }
    ],
    "updatedAt": "2024-01-15T09:00:00.000Z"
  },
  "message": "인기 검색어를 성공적으로 조회했습니다."
}
```

---

## 에러 처리

### 표준 에러 응답
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "요청 데이터가 유효하지 않습니다.",
    "details": [
      {
        "field": "quantity",
        "message": "수량은 1 이상이어야 합니다.",
        "value": 0
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req_1234567890"
}
```

### 에러 코드
| 코드 | HTTP 상태 | 설명 | 해결방법 |
|------|-----------|------|----------|
| `VALIDATION_ERROR` | 400 | 유효성 검사 실패 | 요청 데이터 확인 |
| `PRODUCT_NOT_FOUND` | 404 | 상품을 찾을 수 없음 | 상품 ID 확인 |
| `OUT_OF_STOCK` | 422 | 재고 부족 | 재고 수량 확인 |
| `CART_ITEM_NOT_FOUND` | 404 | 장바구니 아이템 없음 | 장바구니 새로고침 |
| `PAYMENT_FAILED` | 422 | 결제 실패 | 결제 정보 확인 |
| `SERVER_ERROR` | 500 | 서버 내부 오류 | 관리자에게 문의 |

---

## 프론트엔드 연동 가이드

### 1. API 기본 URL 설정

**파일**: `scripts/main.js`

```javascript
// 현재 설정
const CONFIG = {
    API_BASE_URL: '/api', // 개발용 (목업 데이터)
    // ...
};

// 실제 백엔드 연동 시 변경
const CONFIG = {
    API_BASE_URL: 'https://your-api-server.com/api',
    // ...
};
```

### 2. ProductManager 수정

**현재 코드**:
```javascript
async loadProducts() {
    try {
        // const response = await fetch(`${CONFIG.API_BASE_URL}/products`);
        // const data = await response.json();
        
        // 임시: 목업 데이터 사용
        const products = this.getMockProducts();
        // ...
    } catch (error) {
        // ...
    }
}
```

**백엔드 연동 후**:
```javascript
async loadProducts() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/products`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        const products = result.data.products;
        
        this.state.setState({
            products,
            filteredProducts: products
        });
        
        this.updateCategoryCounts();
        
    } catch (error) {
        console.error('상품 로드 실패:', error);
        this.notifications.show('상품을 불러오는 중 오류가 발생했습니다.', 'error');
        
        // 폴백: 목업 데이터 사용
        const products = this.getMockProducts();
        this.state.setState({ products, filteredProducts: products });
    }
}
```

### 3. 장바구니 API 연동

**CartManager에 추가할 메서드**:
```javascript
// 서버와 장바구니 동기화
async syncCartWithServer() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/cart`, {
            headers: {
                'Authorization': `Bearer ${this.getAuthToken()}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            const serverCart = result.data.items.map(item => ({
                id: item.product.id,
                name: item.product.name,
                price: item.unitPrice,
                quantity: item.quantity,
                image: item.product.image
            }));
            
            this.state.setState({ cart: serverCart });
        }
    } catch (error) {
        console.warn('서버 장바구니 동기화 실패:', error);
    }
}

// 서버에 장바구니 아이템 추가
async addToCartServer(productId, quantity = 1) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/cart/items`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productId, quantity })
        });
        
        if (!response.ok) {
            throw new Error('서버 요청 실패');
        }
        
        const result = await response.json();
        return result.data;
        
    } catch (error) {
        console.error('서버 장바구니 추가 실패:', error);
        throw error;
    }
}
```

### 4. 검색 API 연동

**FilterManager에 추가**:
```javascript
// 검색 자동완성
async getSearchSuggestions(query) {
    if (!query || query.length < 2) return [];
    
    try {
        const response = await fetch(
            `${CONFIG.API_BASE_URL}/search/suggestions?q=${encodeURIComponent(query)}&limit=5`
        );
        
        if (response.ok) {
            const result = await response.json();
            return result.data.suggestions;
        }
    } catch (error) {
        console.warn('검색 제안 조회 실패:', error);
    }
    
    return [];
}
```

### 5. 에러 처리 개선

**공통 API 클라이언트**:
```javascript
class ApiClient {
    static async request(url, options = {}) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${url}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new ApiError(result.error?.message || '요청 실패', response.status, result);
            }
            
            return result;
            
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw new ApiError('네트워크 오류가 발생했습니다.', 0, error);
        }
    }
    
    static get(url, params = {}) {
        const searchParams = new URLSearchParams(params).toString();
        const fullUrl = searchParams ? `${url}?${searchParams}` : url;
        return this.request(fullUrl);
    }
    
    static post(url, data) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    static put(url, data) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    static delete(url) {
        return this.request(url, {
            method: 'DELETE'
        });
    }
}

class ApiError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}
```

### 6. 상품 상세페이지 API 연동

**ProductDetailManager에 추가할 메서드**:
```javascript
// 상품 상세 정보 로드
async loadProductDetail(productId) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/products/${productId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        const product = result.data;
        
        // 상품 상세 정보 렌더링
        this.renderProductDetail(product);
        this.showModal();
        
        return product;
        
    } catch (error) {
        console.error('상품 상세 정보 로드 실패:', error);
        this.notifications.show('상품 정보를 불러오는 중 오류가 발생했습니다.', 'error');
        throw error;
    }
}

// 상품 상세페이지 열기 (수정된 버전)
async openModal(productOrId) {
    try {
        let product;
        
        if (typeof productOrId === 'number') {
            // 상품 ID인 경우 API에서 상세 정보 로드
            product = await this.loadProductDetail(productOrId);
        } else {
            // 이미 상품 객체인 경우 그대로 사용
            product = productOrId;
        }
        
        this.currentProduct = product;
        this.renderProductDetail();
        this.showModal();
        
    } catch (error) {
        console.error('상품 상세페이지 열기 실패:', error);
    }
}
```

**상품 카드 클릭 이벤트 수정**:
```javascript
// ProductManager.js 수정
openProductDetail(productId) {
    const productDetail = window.shoppingMallApp.productDetailManager;
    if (productDetail) {
        // API에서 상세 정보 로드하도록 상품 ID만 전달
        productDetail.openModal(productId);
    }
}
```

**다중 이미지 지원**:
```javascript
// 상품 이미지 렌더링 개선
renderProductImages(product) {
    // 메인 이미지 설정
    if (this.mainImage) {
        const mainImage = product.images?.[0] || product.image;
        this.mainImage.src = mainImage;
        this.mainImage.alt = product.name;
    }
    
    // 썸네일 목록 렌더링
    if (product.images && product.images.length > 1) {
        this.renderThumbnails(product.images);
        this.thumbnailList.parentElement.style.display = 'block';
    } else {
        // 이미지가 하나뿐인 경우 썸네일 숨김
        this.thumbnailList.parentElement.style.display = 'none';
    }
}
```

**할인 정보 처리**:
```javascript
// 할인 정보가 API에서 제공되는 경우
renderPriceInfo(product) {
    if (this.currentPrice) {
        this.currentPrice.textContent = Utils.formatCurrency(product.price);
    }

    // API에서 할인 정보 제공
    if (product.originalPrice && product.originalPrice > product.price) {
        if (this.originalPrice) {
            this.originalPrice.textContent = Utils.formatCurrency(product.originalPrice);
            this.originalPrice.style.display = 'block';
        }

        if (this.discountBadge) {
            // API에서 할인율 직접 제공 또는 계산
            const discountRate = product.discountRate || 
                Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
            this.discountBadge.textContent = `-${discountRate}%`;
            this.discountBadge.style.display = 'block';
        }
    } else {
        if (this.originalPrice) this.originalPrice.style.display = 'none';
        if (this.discountBadge) this.discountBadge.style.display = 'none';
    }
}
```

**재고 상태 확인**:
```javascript
// 재고 상태에 따른 UI 업데이트
updateStockStatus(product) {
    const addToCartBtn = this.addToCartBtn;
    const buyNowBtn = this.buyNowBtn;
    
    if (!product.inStock || (product.stockCount && product.stockCount <= 0)) {
        // 재고 없음
        addToCartBtn.disabled = true;
        addToCartBtn.textContent = '품절';
        buyNowBtn.disabled = true;
        
        // 품절 알림 표시
        this.notifications.show('현재 품절된 상품입니다.', 'warning');
    } else if (product.stockCount && product.stockCount < 5) {
        // 재고 부족 경고
        addToCartBtn.disabled = false;
        addToCartBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            장바구니 담기 (재고 ${product.stockCount}개)
        `;
        buyNowBtn.disabled = false;
    } else {
        // 정상 재고
        addToCartBtn.disabled = false;
        addToCartBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            장바구니 담기
        `;
        buyNowBtn.disabled = false;
    }
}
```

**상품 옵션 지원 (확장)**:
```javascript
// 상품 옵션이 있는 경우 UI 추가
renderProductOptions(product) {
    if (!product.options || product.options.length === 0) {
        return;
    }
    
    const optionsContainer = document.querySelector('.product-options');
    if (!optionsContainer) return;
    
    optionsContainer.innerHTML = product.options.map(option => `
        <div class="product-option">
            <h3>${option.name}</h3>
            <select class="option-select" data-option="${option.name}">
                ${option.values.map((value, index) => `
                    <option value="${value}" data-price-add="${option.priceAdd[index] || 0}">
                        ${value} ${option.priceAdd[index] > 0 ? `(+${Utils.formatCurrency(option.priceAdd[index])})` : ''}
                    </option>
                `).join('')}
            </select>
        </div>
    `).join('');
    
    // 옵션 변경 이벤트 리스너
    optionsContainer.addEventListener('change', () => {
        this.updatePriceWithOptions(product);
    });
}

// 옵션에 따른 가격 업데이트
updatePriceWithOptions(product) {
    let totalPrice = product.price;
    const optionSelects = document.querySelectorAll('.option-select');
    
    optionSelects.forEach(select => {
        const selectedOption = select.options[select.selectedIndex];
        const priceAdd = parseInt(selectedOption.dataset.priceAdd) || 0;
        totalPrice += priceAdd;
    });
    
    if (this.currentPrice) {
        this.currentPrice.textContent = Utils.formatCurrency(totalPrice);
    }
}
```

### 7. 환경별 설정

**환경 변수 지원**:
```javascript
const CONFIG = {
    API_BASE_URL: process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000/api'
        : 'https://api.your-domain.com/api',
    // ...
};
```

---

## 📋 백엔드 개발 체크리스트

### 필수 구현 API
- [ ] `GET /api/health` - 서버 상태 체크
- [ ] `GET /api/products` - 상품 목록
- [ ] `GET /api/products/{id}` - 상품 상세
- [ ] `GET /api/categories` - 카테고리 목록
- [ ] `GET /api/cart` - 장바구니 조회
- [ ] `POST /api/cart/items` - 장바구니 추가
- [ ] `PUT /api/cart/items/{id}` - 수량 수정
- [ ] `DELETE /api/cart/items/{id}` - 상품 삭제
- [ ] `DELETE /api/cart` - 장바구니 비우기
- [ ] `POST /api/orders` - 주문 생성

### 선택적 구현 API
- [ ] `GET /api/search/suggestions` - 검색 자동완성
- [ ] `GET /api/search/popular` - 인기 검색어
- [ ] `GET /api/orders/{id}` - 주문 상태 조회

### 기술적 요구사항
- [ ] CORS 설정
- [ ] JSON 응답 형식 통일
- [ ] 에러 처리 표준화
- [ ] 페이지네이션 지원
- [ ] 검색/필터링 지원
- [ ] 재고 관리
- [ ] 이미지 업로드/관리

### 보안 및 성능
- [ ] 입력 데이터 유효성 검사
- [ ] SQL 인젝션 방지
- [ ] XSS 방지
- [ ] 레이트 리미팅
- [ ] 캐싱 전략
- [ ] 데이터베이스 최적화

---