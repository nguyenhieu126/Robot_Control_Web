Cài đặt ban đầu
    # tạo thư mục
    mkdir backend frontend

    # backend
    cd backend
    npm init -y
    npm install express pg cors dotenv mqtt
    npm install nodemon --save-dev

    # frontend
    cd ..
    cd frontend
    npx create-react-app .
    npm install axios

Chạy chương trình
    # đảm bảo PostgreSQL đang chạy
        windows thì chỉ cần mở pgAdmin
        Hoặc check bằng terminal
        psql -U postgres
    # backend
        cd backend
        npm nodemon server.js
        Hoặc node server.js
        Server chạy tại: http://localhost:5000
    # frontend
        cd frontend
        npm start
        Web sẽ chạy tại http://localhost:3000


