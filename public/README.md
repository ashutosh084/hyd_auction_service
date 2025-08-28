This directory is used to store public assets such as images for the auction application.

## API Endpoints

### 1. List Items

**Endpoint**: `/items`

**Method**: GET

**Description**: Retrieves a list of items available for auction. Each item includes its name, price, and an array of image URLs.

**Response Example**:

```json
[
  {
    "name": "Item 1",
    "price": 100,
    "images": ["/public/image1.jpg", "/public/image2.jpg"]
  },
  {
    "name": "Item 2",
    "price": 200,
    "images": ["/public/image3.jpg"]
  }
]
```

### 2. Add Item

**Endpoint**: `/items`

**Method**: POST

**Description**: Adds a new item to the auction. The item is associated with a default user. Images should be uploaded as files in the `images` field.

**Request Body Example**:

```json
{
  "name": "New Item",
  "price": 150
}
```

**Response Example**:

```json
{
  "message": "Item added successfully"
}
```

**Note**: Images should be sent as `multipart/form-data` in the `images` field.
