# CareSync

A modern, AI-powered healthcare management platform that streamlines patient care through unified records, intelligent monitoring, and seamless communication between patients and healthcare providers.

## Features

- **AI Assistance**: Clinical intelligence that monitors patient data and delivers evidence-based guidance in real time
- **Patient Records**: Unified health records across all care touchpoints — HIPAA-compliant, end-to-end encrypted
- **Smart Monitoring**: Continuous vitals tracking with intelligent alerting and 360° health profile
- **Appointment Management**: Easy booking and management of medical appointments
- **File Upload & Management**: Secure upload and storage of medical documents, prescriptions, lab reports, and scans
- **Real-time Chat**: Direct communication between patients and doctors
- **Doctor Portal**: Dedicated interface for healthcare providers to manage patient care

## Tech Stack

- **Frontend**: React 19, Vite
- **Styling**: Stitches (CSS-in-JS)
- **Animations**: Framer Motion
- **Backend API**: Connects to a REST API (default: http://localhost:5000/api)
- **Authentication**: JWT-based authentication
- **State Management**: React hooks with local storage persistence

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd caresync
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add:
   ```
   VITE_API_URL=http://localhost:5000/api
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

### For Patients
- Sign up or log in to access your dashboard
- View your health overview, including BMI and vital statistics
- Book and manage appointments
- Upload medical files and documents
- Chat with your healthcare providers
- Monitor your health data in real-time

### For Doctors
- Access the doctor portal for patient management
- View patient records and health data
- Communicate with patients through the chat system
- Manage appointments and diagnoses

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the project for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint for code quality checks

## Project Structure

```
src/
├── App.jsx          # Main application component
├── main.jsx         # Application entry point
├── index.css        # Global styles
├── App.css          # Component-specific styles
└── assets/          # Static assets
```

## API Integration

The application expects a backend API running on `http://localhost:5000/api` with the following endpoints:

- Authentication: `/auth/login`, `/auth/register`, `/auth/me`
- Appointments: `/appointments`
- Files: `/files`
- Chat: `/chat`
- Patient data: `/patients`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

## License

This project is private and proprietary.
"# CareSync" 

