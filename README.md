# PA Scheduler

A comprehensive Physician Assistant (PA) scheduling management system built with Next.js. This application automates the complex process of assigning PAs to shifts while enforcing multiple scheduling rules and constraints.

## What This Application Does

The PA Scheduler is designed to solve the challenging problem of creating fair and compliant work schedules for Physician Assistants in healthcare settings. Here's what it accomplishes:

### Core Functionality

**Automated Schedule Generation**: The system takes PA availability, work preferences, and shift requirements as input and automatically generates optimal schedules that comply with all scheduling rules.

**Rule-Based Assignment**: Implements 8 comprehensive scheduling rules including:
- Overnight shift distribution (2 shifts every other week)
- Mandatory rest periods after overnight shifts
- 11-hour rest requirements between shifts
- Weekend shift quotas (2 per month)
- Paycheck period limits (6 shifts per 2-week period)
- Consecutive shift limits (max 3 in a row)
- Single assignment per day per PA
- Conflict prevention for requested days off

**Visual Calendar Interface**: Provides an intuitive calendar view where users can:
- See all shifts and assignments at a glance
- Drag and drop templates to apply shift patterns
- Select multiple dates for bulk operations
- View PA assignments with color-coded shift types

**Template System**: Allows creation of reusable day templates (e.g., "Standard Day", "Busy Day") that can be quickly applied to calendar dates, ensuring consistency across the schedule.

**Data Import/Export**: Supports Excel file uploads containing:
- PA work preferences and availability
- Requested days off
- PA roster information
- Per Diem staff availability

**Real-Time Validation**: Continuously monitors and prevents rule violations, providing immediate feedback when assignments would conflict with scheduling requirements.

### Problem It Solves

Healthcare scheduling is notoriously complex due to:
- Multiple overlapping constraints (labor laws, union rules, patient care requirements)
- Staff preferences and availability conflicts
- Fair distribution of desirable vs. undesirable shifts
- Compliance with rest period regulations
- Balancing workload across pay periods

This application eliminates manual scheduling errors, reduces administrative time, and ensures fair, compliant schedules that satisfy both management and staff requirements.

### Target Users

- **Healthcare Administrators**: Who need to create compliant schedules quickly
- **PA Managers**: Who must balance staff preferences with operational needs
- **HR Departments**: Who need to ensure labor law compliance
- **PA Staff**: Who benefit from fair, predictable scheduling

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Features

- **Calendar Management**: Create and manage shift schedules with a visual calendar interface
- **PA Assignment**: Automatically assign Physician Assistants to shifts based on scheduling rules
- **Template System**: Create reusable day templates for consistent shift patterns
- **File Upload**: Import PA data, work requests, and availability from Excel files
- **Rule Enforcement**: Automatically enforce complex scheduling rules and constraints
- **Multi-select**: Select multiple dates for bulk operations
- **Real-time Validation**: Check for rule violations and conflicts in real-time

## Scheduling Rules

1. PA are requires to work 2 overnight shift every other week.
    Example: 
        Week 1: 2 overnight shift         
        Week 2: -Cant be assign to overnight shift
        _____Options 1___________________
        Week 2: 1 Overnight Shift 
        Week 4: 1 overnight shift 
        _____Options 2___________________
        Week 3: 2 Overnight Shift 
        Week 4: 0 overnight shift 
        _____Options 3___________________
        Week 3: 0 Overnight Shift 
        Week 4: 2 overnight shift 



2. If they work on a night shift, they have the next two days off
    Example:
        If they work on Wednesday, They get Thursday and Friday off
        If they work on Monday, they get Tuesday and Wednesday off

3. PA must rest for 11 hours before returning to work after shift

4. PA must work 2 weekend shift per month.     

5. PA work total of 6 Shift max every paycheck (Week 1 + 2 | Week 3 + 4)

6. Week begin on a Monday and end on a Sunday

7. Each Slot is a position a PA can work in. So on the same day, it's impossible for a PA to fill two slot. 
    Example: 9/1/2025 there is 2 AM slot, We would need two different PA to fill each of those slot.

8. No more then 3 consecutive shift in a row.
    Example: We wouldnt assign a PA all 6 shift in one week and then no shift the next week. Try to space them out.

## File Format

Excel files with the following sheets:

**Sheet 1 [RequestedWorkDay]**: 
    Structure format: Name(ID) | Date | Shift [7AM | 7PM | 8AM | 10 AM]     
    Notes: Contains the date of the PA wants to work. 
    Explaination: PA are allow to create their own schedule. Those who do, will follows the scheduling rules.
    We will take those dates and put it on the shift

**Sheet 2 [RequestedDayOff]**: 
      Structure format: Name(ID) | Date 
      Notes: Contains the day they cant work

**Sheet 3 [ListOfPA]**: 
    Structure format: Name(ID) | Number of Shift
    Notes: Contains the list of PA that are available to work
    We will start assigning PA from top to bottom.

**Sheet 4 [ListOfPerDiem]**:
    Structure format: Name(ID) | Number of Shift | Dates Available to Work Start | Dates Available to Work End
    Notes: Per Diem are slot filler(they are contract worker), if there's empty slot at the end of assign the list of PA. 
    We will assign Per Diem to fill in the slot if it's fit the Dates Available to work. 

## Calendar System

Calendar begins on as Monday and Ends on Sunday(So some month doesnt start on the 1st)
User is allow to add or delete shift slot. There's 4 types of shift slot
1. 7AM - 7PM - [#27D3F5]
2. 7PM - 7AM - [#B027F5]
3. 8AM - 8PM - [#F54927]
4. 10AM - 10PM - [#4927F5]

Example 1a:
User can have a day with 
3 7AM slot, 2 7PM, 1 8AM and 2 10AM or 
2 7AM slot, 3 7PM, 2 8AM and 1 10AM 

The calendar will show the different shift on those day and show who is working on those shift. User are allow to modify the calendar. 

Calendar day Template:
User is also allow to create template. Calendar day template from example 1a where each day would that different shift slot. User can click and drag the template to the calendar date to apply it.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details. 