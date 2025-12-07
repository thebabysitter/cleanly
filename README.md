# CleanSchedule - Airbnb Cleaning Management Platform

A comprehensive web application for Airbnb hosts to manage property cleanings, track cleaner schedules, monitor payments, and maintain property checklists.

## Features

### Property Management
- Add and manage multiple Airbnb properties
- Store property details (name, address, description)
- Customize task checklists for each property
- Track cleaning history per property

### Cleaner Management
- Maintain a roster of cleaning staff
- Set hourly rates for each cleaner
- Store contact information (email, phone)
- Track performance and payment history

### Cleaning Scheduling
- Schedule cleanings with date and time
- Assign cleaners to specific properties
- Automatic payment calculation based on duration and hourly rate
- Status tracking (Scheduled → In Progress → Completed)
- Add notes for special instructions
- Easy rescheduling when plans change

### Media Documentation
- Cleaners can upload photos and videos of completed work
- View cleaning documentation timeline
- Verify cleaning quality through visual proof

### Payment Tracking
- Real-time calculation of amounts owed to cleaners
- View payment breakdown by cleaner
- Detailed transaction history
- Filter by cleaner to see individual balances
- Track completed cleanings and associated costs

### Property Checklists
- Create custom to-do lists for each property
- Mark tasks as complete
- Maintain consistent cleaning standards

## Tech Stack

- **Frontend**: Next.js 13 (App Router), React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (email/password)
- **Icons**: Lucide React

## Database Schema

### Tables
- **profiles** - User profiles (hosts and cleaners)
- **properties** - Airbnb property listings
- **cleaners** - Cleaning staff roster
- **cleanings** - Scheduled and completed cleaning sessions
- **cleaning_media** - Photos/videos of completed cleanings
- **property_tasks** - Customizable checklists per property

All tables include Row Level Security (RLS) policies to ensure data privacy and access control.

## Getting Started

### Prerequisites
- Node.js 18+ installed
- A Supabase account

### 1. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. The database schema has already been applied via the migration system
3. Get your project credentials:
   - Go to Project Settings → API
   - Copy the Project URL
   - Copy the anon/public key

### 2. Configure Environment Variables

Update `.env.local` with your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### 5. Build for Production

```bash
npm run build
```

## Usage Guide

### First-Time Setup

1. **Sign Up**: Create your host account on the authentication page
2. **Add Properties**: Navigate to the Properties tab and add your Airbnb listings
3. **Add Cleaners**: Go to the Cleaners tab and add your cleaning staff with their hourly rates
4. **Create Checklists**: For each property, create a custom cleaning checklist

### Scheduling Cleanings

1. Go to the Cleanings tab
2. Click "Schedule Cleaning"
3. Select the property and cleaner
4. Choose date and time
5. Enter expected duration (optional - used for payment calculation)
6. Add any special notes

### Tracking Progress

- View all scheduled cleanings in the Cleanings tab
- Filter by status (All, Scheduled, Completed)
- Click on any cleaning to view details
- Update status as work progresses
- View uploaded photos/videos

### Managing Payments

- The Payments tab shows all amounts owed to cleaners
- View total owed across all cleaners
- Filter by specific cleaner to see detailed breakdown
- Payments are automatically calculated based on:
  - Duration of cleaning (hours)
  - Cleaner's hourly rate

## Features in Detail

### Rescheduling
Easily reschedule cleanings by editing the scheduled date and time. Perfect for handling last-minute changes from Airbnb guests or cleaner availability.

### Payment Calculation
When scheduling a cleaning:
- Enter the expected duration in hours
- The system automatically calculates: Duration × Hourly Rate
- View this amount in the cleaning details and payments section

### Property History
For each property, view:
- All past cleanings
- Which cleaner handled each cleaning
- When the cleaning was completed
- Photos/videos from each cleaning session

### Cleaner Assignment
Track which properties each cleaner typically handles and view their complete cleaning history across all properties.

## Security

- All data is protected with Row Level Security (RLS)
- Hosts can only access their own properties and cleanings
- Authentication required for all operations
- Secure password-based authentication

## Support

For issues or questions, please refer to the Supabase documentation or Next.js documentation for technical details.

## License

This project is private and proprietary.
