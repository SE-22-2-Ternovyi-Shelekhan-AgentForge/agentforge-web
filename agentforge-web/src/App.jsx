import 'bootstrap/dist/css/bootstrap.min.css';
import React from 'react';
import icon from './assets/agentForge-icon.png';

function App() {
  return (
    <div className="bg-dark text-white min-vh-100" style={{ backgroundColor: '#05070a' }}>
      <nav className="navbar navbar-dark border-bottom border-secondary fixed-top px-4" style={{ backgroundColor: 'rgba(5, 7, 10, 0.8)', backdropFilter: 'blur(10px)' }}>
        <a className="navbar-brand fw-bold d-flex align-items-center gap-2" href="#">
          <img src={icon} alt="Logo" width="28" height="28" />
          <span>Agent<span className="text-primary">Forge</span></span>
        </a>
      </nav>

      <section className="vh-100 d-flex flex-column justify-content-center align-items-center text-center px-3" style={{ background: 'radial-gradient(circle at center, #1a1d24 0%, #05070a 100%)' }}>
        <div className="container" style={{ marginTop: '60px' }}>
          <h1 className="display-4 fw-bold mb-4" style={{ letterSpacing: '-1px' }}>
            Інтелектуальна платформа мультиагентної взаємодії для вирішення комплексних задач
          </h1>
          <p className="lead text-secondary mb-5 mx-auto" style={{ maxWidth: '800px' }}>
            Автоматизація складних задач за допомогою віртуальних команд ШІ-агентів. 
            Створюйте ролі, делегуйте задачі та спостерігайте за процесом вирішення у реальному часі.
          </p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <button className="btn btn-primary px-4 py-2 fw-bold">Мій простір</button>
            <button className="btn btn-outline-light px-4 py-2 fw-bold">Документація</button>
          </div>
        </div>
      </section>

      <section className="py-5" style={{ backgroundColor: '#0a0c12' }}>
        <div className="container py-5">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <h2 className="display-6 fw-bold mb-4">Autonomous Orchestration</h2>
              <p className="text-secondary fs-5 mb-4">
                Замість ручного перемикання ролей у діалогах з LLM, платформа автоматизує процес через Router-агента та спеціалізованих воркерів.
              </p>
              <ul className="list-unstyled fw-medium fs-5">
                <li className="mb-3 d-flex align-items-start gap-2">
                  <span className="text-primary">⚡</span> 
                  <span><strong>Meta-Agent:</strong> Автоматичне формування команди на основі опису задачі.</span>
                </li>
                <li className="mb-3 d-flex align-items-start gap-2">
                  <span className="text-primary">🧠</span> 
                  <span><strong>LangGraph Core:</strong> Збереження стану графа та контексту розмови в PostgreSQL.</span>
                </li>
                <li className="mb-3 d-flex align-items-start gap-2">
                  <span className="text-primary">📡</span> 
                  <span><strong>Real-time UI:</strong> Миттєве відображення активного агента та повідомлень через SignalR.</span>
                </li>
              </ul>
            </div>

            <div className="col-lg-6">
              <div className="card bg-black border-secondary shadow-lg">
                <div className="card-header border-secondary d-flex justify-content-between align-items-center" style={{ backgroundColor: '#111' }}>
                  <span className="text-secondary small fw-bold">Live Agent Task Execution</span>
                  <span className="badge bg-primary">3 Agents Active</span>
                </div>
                <div className="card-body p-4 d-flex flex-column gap-3" style={{ fontSize: '0.9rem' }}>
                  <div className="align-self-end text-end" style={{ maxWidth: '80%' }}>
                    <div className="text-secondary small mb-1">User</div>
                    <div className="bg-primary text-white p-2 rounded-3">Розроби архітектуру бази даних для інтернет-магазину.</div>
                  </div>

                  <div className="align-self-start" style={{ maxWidth: '80%' }}>
                    <div className="text-secondary small mb-1">Supervisor Agent</div>
                    <div className="bg-dark text-light p-2 rounded-3 border border-secondary">
                      Завдання отримано. Передаю виконання Worker Agent для створення схеми таблиць.
                    </div>
                  </div>

                  <div className="align-self-start" style={{ maxWidth: '80%' }}>
                    <div className="text-secondary small mb-1">Worker Agent</div>
                    <div className="bg-dark text-light p-2 rounded-3 border border-secondary">
                      Сгенеровано 5 основних таблиць: Users, Products, Orders, OrderItems, Categories. Чекаю на рев'ю.
                    </div>
                  </div>

                  <div className="align-self-start" style={{ maxWidth: '80%' }}>
                    <div className="text-warning small mb-1">Critic Agent is typing...</div>
                    <div className="bg-dark text-secondary p-2 rounded-3 border border-secondary">
                      <span className="spinner-grow spinner-grow-sm me-1" role="status" aria-hidden="true"></span>
                      Аналіз зв'язків бази даних...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-4 bg-black border-top border-secondary text-center text-secondary">
        <small>SE-22-2-Ternovyi-Shelekhan-AgentForge &copy; 2026</small>
      </footer>
    </div>
  );
}

export default App;