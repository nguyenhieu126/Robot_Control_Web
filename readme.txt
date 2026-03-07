Cài đặt ban đầu để khởi tạo ban đầu
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


Các bước:
    # Tải code về máy (Clone)
    git clone https://github.com/nguyenhieu126/Robot_Control_Web.git
    cd Robot_Control_Web

    # cài đặt các thư viện
        cd backend
        npm install
        cd ../frontend
        npm install

    # chạy chương trình
        Backend
            cd backend
            node server.js
        Frontend
            cd frontend
            npm start