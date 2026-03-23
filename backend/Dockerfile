# Sử dụng JDK 17
FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app

# Copy toàn bộ code từ thư mục backend vào container
COPY . .

# Cấp quyền thực thi cho Maven Wrapper
RUN chmod +x mvnw

# Build dự án
RUN ./mvnw clean package -DskipTests

# Chạy ứng dụng
ENTRYPOINT ["sh", "-c", "java -jar target/*.jar"]