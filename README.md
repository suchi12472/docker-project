# Calculator App

A 3-tier calculator web application containerized with Docker. The app performs arithmetic operations and stores every calculation in a MySQL database, with a history panel that updates in real time.

---

## Preview

```
[ Calculator UI ] ——> [ Node.js API ] ——> [ MySQL ]
     nginx:8080           :5000            :3306
```

---

## Tech Stack

- **Frontend** — HTML, CSS, Vanilla JS served via nginx
- **Backend** — Node.js with Express
- **Database** — MySQL 8.0
- **Containerization** — Docker

---

## Project Structure

```
calculator-app/
├── frontend/
│   ├── index.html
│   └── Dockerfile
├── backend/
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── mysql/
│   └── init.sql
└── docker-compose.yml
```

---

## Network Design

Two custom bridge networks isolate traffic between tiers:

```
frontend-network:  Frontend  <——>  Backend
backend-network:   Backend   <——>  Database
```

The frontend has no direct route to the database. All data goes through the backend API.

---

## Getting Started

### Prerequisites

- Docker installed and running on your machine

### Run with Docker Compose

```bash
docker compose up --build
```

Open `http://localhost:8080`

---

### Run Manually (step by step)

**1. Create networks**

```bash
docker network create frontend-network
docker network create backend-network
```

**2. Start the database**

```bash
docker run -d \
  --name calc-database \
  --network backend-network \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=calculatordb \
  -e MYSQL_USER=calcuser \
  -e MYSQL_PASSWORD=calcpass \
  -v db-data:/var/lib/mysql \
  mysql:8.0
```

> Windows PowerShell: replace `\` with a backtick `` ` ``

Wait 10-15 seconds for MySQL to initialize, then create the table:

```bash
docker exec -it calc-database bash
mysql -u calcuser -p    # password: calcpass
```

```sql
USE calculatordb;

CREATE TABLE history (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  expression VARCHAR(255) NOT NULL,
  result     VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**3. Start the backend**

```bash
cd backend
docker build -t calc-backend .

docker run -d \
  --name calc-backend \
  --network backend-network \
  -e DB_HOST=calc-database \
  -e DB_USER=calcuser \
  -e DB_PASSWORD=calcpass \
  -e DB_NAME=calculatordb \
  -p 5000:5000 \
  calc-backend

docker network connect frontend-network calc-backend
```

**4. Start the frontend**

```bash
cd ../frontend
docker build -t calc-frontend .

docker run -d \
  --name calc-frontend \
  --network frontend-network \
  -p 8080:80 \
  calc-frontend
```

**5. Open browser**

```
http://localhost:8080
```

---

## API Reference

| Method | Endpoint     | Description                        |
|--------|--------------|------------------------------------|
| POST   | /calculate   | Evaluates expression, saves to DB  |
| GET    | /history     | Returns last 20 calculations       |
| GET    | /health      | Health check                       |

---

## Verify Data in MySQL

```bash
docker exec -it calc-database bash
mysql -u calcuser -p
```

```sql
USE calculatordb;
SELECT * FROM history;
```

---

## Stop and Clean Up

```bash
docker rm -f calc-frontend calc-backend calc-database
docker network rm frontend-network backend-network
docker volume rm db-data
```

---

## Key Concepts Covered

- Multi-container communication using container names as hostnames
- Network segmentation to restrict access between tiers
- Passing configuration through environment variables
- Persistent storage using Docker volumes
- Difference between building custom images and using official ones
