# Sử dụng JDK 17
FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app
COPY . .
# Cấp quyền và build
RUN chmod +x mvnw
RUN ./mvnw clean package -DskipTests
# Dòng lệnh "vạn năng" tự tìm file .jar để chạy
ENTRYPOINT ["sh", "-c", "java -jar target/*.jar"]