import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";

function Register() {
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
      await axiosClient.post("/api/auth/register", {
        username: formData.username,
        password: formData.password,
      });
      navigate("/login");
    } catch (requestError) {
      const fallbackMessage =
        "Đăng ký thất bại. Thử lại với tên đăng nhập khác.";
      setError(requestError.response?.data?.message || fallbackMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Tạo tài khoản mới</h1>
        <p className="auth-subtitle">
          Tham gia hệ thống chat realtime ngay bây giờ.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="username">Tên đăng nhập</label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="Tối đa 50 ký tự"
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
            placeholder="Tối đa 255 ký tự"
            value={formData.password}
            onChange={handleChange}
            required
            maxLength={255}
          />

          {error ? <div className="form-error">{error}</div> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang tạo tài khoản..." : "Đăng ký"}
          </button>
        </form>

        <p className="auth-footer">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
