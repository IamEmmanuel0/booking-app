const API_URL = "http://127.0.0.1:3000"

// Show alert message
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert px-6 py-4 rounded-lg shadow-lg text-white ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
    alertDiv.textContent = message;
    document.getElementById('alertContainer').appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 4000);
}

// Show page
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    if (pageId === 'profilePage') {
        document.getElementById('navbar').classList.remove('hidden');
        loadProfile();
    } else {
        document.getElementById('navbar').classList.add('hidden');
    }
}

async function handleRegister(e) {
  e.preventDefault()
  
  const data = {
    name: document.getElementById('regName').value,
    email: document.getElementById('regEmail').value,
    password: document.getElementById('regPassword').value,
    age: Number(document.getElementById('regAge').value) || 0,
    field: document.getElementById('regField').value,
  }
  

  try {
    const res = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })

    const result = await res.json()

    if (res.ok) {
      alert("Registration successful, Please login")
      // redirect to the login page after successful registration
      window.location.replace('http://127.0.0.1:5500/login');
      e.target.reset()
    } else {
      alert(result.error || "Registration failed")
    }
  } catch (error) {
    alert("Network error", error)
  }
}

async function handleLogin(e) {
  e.preventDefault()
  
  const data = {
    email: document.getElementById('loginEmail').value,
    password: document.getElementById('loginPassword').value
  }
  

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })

    const result = await res.json()

    if (res.ok) {
      alert("Login successful")
      localStorage.setItem('authToken', result.token)
      // redirect to the login page after successful login
      // window.location.replace('http://127.0.0.1:5500/profile');
      e.target.reset()
    } else {
      alert(result.error || "Login failed")
    }
  } catch (error) {
    alert("Network error", error)
  }
}
