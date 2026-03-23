# Sử dụng JDK 17 bản nhẹ
FROM eclipse-temurin:17-jdk-alpine

WORKDIR /app

# Copy toàn bộ nội dung thư mục backend vào /app
COPY . .

# Chạy lệnh build trực tiếp qua shell để né lỗi permission
RUN sh mvnw clean package -DskipTests

# Chạy ứng dụng
ENTRYPOINT ["sh", "-c", "java -jar target/*.jar"]