# ACKit IoT Management System - Frontend

A comprehensive React frontend for the ACKit IoT Management System with role-based access control for Super Admin, Admin, and Manager users.

## 🚀 Features

### 🔴 Super Admin

- **View-only access** to all system data
- **Suspend/Resume admins** with cascade effects
- **Monitor all activities** across the system
- **Email notifications** to affected admins
- **Activity logging** for audit trails

### 🟡 Admin

- **Manage managers** (create, lock, unlock, restricted unlock)
- **Manage organizations** (create, suspend, resume)
- **Manage venues** (create, suspend, resume)
- **Manage AC devices** (create, suspend, resume)
- **Dashboard** with counts and statistics
- **Activity logs** for all actions

### 🟢 Manager

- **Control AC devices** in assigned organizations
- **Split organizations** into multiple parts
- **Set temperatures** and power states
- **Restricted access** when locked by admin
- **Real-time controls** for AC management

## 🛠️ Technology Stack

- **React 19** - Frontend framework
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Axios** - API communication
- **React Hot Toast** - Notifications
- **Lucide React** - Icons
- **Recharts** - Charts (for future use)

## 📦 Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Start the development server:**

   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

## 🔧 Configuration

### Backend Connection

The frontend connects to the backend API via Vite proxy. Make sure your backend server is running on port 5050 (default).

### Environment Variables

The API configuration is centralized in `src/config/api.js`. Update the `BACKEND_IP` constant to change the backend server IP address across the entire frontend.

Default configuration:
- Backend IP: `10.27.249.140`
- Backend Port: `5050`
- Frontend Port: `3000`

## 🎯 Usage

### 1. Login

- Navigate to `http://10.27.249.140:3000` (or update IP in config file)
- Select your role (Super Admin, Admin, or Manager)
- Enter your credentials
- Click "Sign in"

### 2. Demo Credentials

- **Super Admin:** `talhaabid400@gmail.com` / `superadmin123`
- **Admin:** `admin@example.com` / `admin123`
- **Manager:** `manager@example.com` / `manager123`

### 3. Role-Based Features

#### Super Admin Dashboard

- View all admins, managers, organizations, and ACs
- Suspend/resume specific admins
- Monitor system-wide activity logs
- Send email notifications

#### Admin Dashboard

- Create and manage managers
- Lock/unlock managers (full or restricted access)
- Manage organizations and venues
- Create and manage AC devices
- View dashboard statistics

#### Manager Dashboard

- View assigned organizations
- Split organizations into multiple parts
- Control AC temperatures and power
- Lock/unlock AC devices
- Restricted access when locked by admin

## 🔐 Authentication

The system uses JWT tokens for authentication:

- Tokens are stored in localStorage
- Automatic token refresh on API calls
- Role-based route protection
- Automatic logout on token expiration

## 📱 Responsive Design

The frontend is fully responsive and works on:

- Desktop computers
- Tablets
- Mobile phones

## 🎨 UI Components

### Status Badges

- **Active:** Green badge
- **Suspended:** Red badge
- **Locked:** Red badge
- **Unlocked:** Green badge
- **Restricted:** Yellow badge

### Action Buttons

- **Primary:** Blue buttons for main actions
- **Success:** Green buttons for positive actions
- **Danger:** Red buttons for destructive actions
- **Warning:** Yellow buttons for caution actions

## 🔄 State Management

- **AuthContext:** Manages user authentication and role
- **API Service:** Handles all backend communication
- **Local State:** Component-level state management
- **Toast Notifications:** User feedback system

## 🚨 Error Handling

- **API Errors:** Displayed via toast notifications
- **Network Errors:** Graceful fallback messages
- **Authentication Errors:** Automatic redirect to login
- **Validation Errors:** Form-level error display

## 📊 Future Enhancements

- **Real-time updates** via WebSocket
- **Charts and analytics** dashboard
- **Export functionality** for reports
- **Advanced filtering** and search
- **Bulk operations** for multiple items
- **Mobile app** version

## 🐛 Troubleshooting

### Common Issues

1. **Backend Connection Failed**

   - Ensure backend server is running on port 5000
   - Check CORS configuration in backend
   - Verify API endpoints are accessible

2. **Authentication Issues**

   - Clear localStorage and try logging in again
   - Check if JWT token is valid
   - Verify user credentials

3. **Styling Issues**
   - Ensure Tailwind CSS is properly configured
   - Check if all CSS classes are available
   - Verify responsive breakpoints

## 📝 API Endpoints

### Super Admin

- `POST /api/superadmin/login` - Login
- `GET /api/superadmin/admins` - Get all admins
- `POST /api/superadmin/admins/:id/suspend` - Suspend admin
- `POST /api/superadmin/admins/:id/resume` - Resume admin

### Admin

- `POST /api/admin/login` - Login
- `GET /api/admin/my-managers` - Get managers
- `POST /api/admin/managers` - Create manager
- `POST /api/admin/managers/lock` - Lock manager
- `POST /api/admin/managers/unlock` - Unlock manager

### Manager

- `POST /api/manager/login` - Login
- `GET /api/manager/organizations` - Get organizations
- `POST /api/manager/organizations/:id/split` - Split organization
- `PATCH /api/manager/acs/:id/temperature` - Set AC temperature

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**ACKit IoT Management System** - Built with ❤️ for efficient AC device management
