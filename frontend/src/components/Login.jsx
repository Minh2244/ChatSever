import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await axiosClient.post("/api/auth/login", formData);
      const user = response.data;
      localStorage.setItem(
        "chat_user",
        JSON.stringify({
          userId: user.userId,
          username: user.username,
          avatarUrl: user.avatarUrl ?? "",
        }),
      );
      navigate("/chat");
    } catch (requestError) {
      const fallbackMessage =
        "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.";
      setError(requestError.response?.data?.message || fallbackMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Đăng nhập ChatSever</h1>
        <p className="auth-subtitle">
          Kết nối ngay với mọi người trong phòng chat.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="username">Tên đăng nhập</label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="Nhập tên đăng nhập"
            value={formData.username}
            onChange={handleChange}
            required
            maxLength={50}
          />

          <label htmlFor="password">Mật khẩu</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Nhập mật khẩu"
            value={formData.password}
            onChange={handleChange}
            required
            maxLength={255}
          />

          {error ? <div className="form-error">{error}</div> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <p className="auth-footer">
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
