# Design System

## Overview

The application follows a **minimalist design philosophy** focused on clarity, calm visual tone, and ease of use during field service.

The UI must remain extremely simple because users will often interact with the app quickly before or during preaching sessions.

Design principles:

- minimal interface
- large readable elements
- clear actions
- soft pastel colors
- minimal cognitive load
- optimized for mobile usage

The design must prioritize **speed and clarity over visual complexity**.

---

# Color Palette

The design uses a calm palette based on:

- white
- pastel purple
- pastel green

These colors communicate organization and calmness.

## Primary Colors

Primary Purple

HEX: #8B7CF6

Used for:

- primary buttons
- highlights
- navigation accents

---

Secondary Purple (Background)

HEX: #F2F1FE

Used for:

- card highlights
- selected states
- secondary backgrounds

---

Success Green

HEX: #7ED9B5

Used for:

- completed segments
- progress bars
- success indicators

---

Soft Green Background

HEX: #EAF9F3

Used for:

- progress background
- success cards

---

Neutral Colors

Background

HEX: #FAFAFC

Card background

HEX: #FFFFFF

Borders

HEX: #E8E8EF

Primary text

HEX: #2E2E38

Secondary text

HEX: #6B6B7A

---

# Typography

The app should use a modern, highly readable font.

Recommended fonts:

Inter

or

Plus Jakarta Sans

Typography scale:

Heading Large
24px
SemiBold

Heading Medium
20px
SemiBold

Body
16px
Regular

Small text
14px
Regular

---

# Layout Principles

The UI should maintain large spacing and clean structure.

Spacing scale:

4
8
16
24
32

Common usage:

screen padding: 20  
card padding: 16  
space between sections: 24

Avoid dense layouts.

White space is intentional.

---

# Components

## Cards

Cards are used extensively throughout the app.

Properties:

borderRadius: 16  
padding: 16  
background: white  
shadow: very soft

Cards should group information clearly.

---

## Buttons

### Primary Button

Used for the main action of the screen.

Color:

Primary Purple

Height:

48

Border radius:

12

Text color:

White

Example actions:

Open Google Maps  
Save Progress  
Generate Assignments

---

### Secondary Button

Used for secondary actions.

Background:

Light purple

Text:

Primary purple

Border radius:

12

---

# Progress Indicators

Progress bars are used to represent territory completion.

Color:

Green pastel

Background:

Soft green

Example:

3 / 6 segments completed

---

# Lists

Segment lists should be extremely simple.

Use checkboxes.

Example:

☑ Rua das Laranjeiras (lado direito)  
☐ Rua das Laranjeiras (lado esquerdo)  
☐ Rua Ipê amarelo  

Spacing between items:

12px

Avoid dense list layouts.

---

# Territory Image

Each territory includes an image representing the area.

Image style:

borderRadius: 12

Images should appear inside cards.

---

# Screen Design Guidelines

Each screen should follow this rule:

1 primary action per screen.

Avoid multiple competing buttons.

Screens should feel calm and uncluttered.

---

# Home Screen Layout

The home screen should display:

Greeting

Today's meeting location

Assigned territory

Territory progress

Primary action button

Example layout:

Greeting

Meeting location card

Territory card with image

Progress indicator

Open Maps button

---

# Territory Screen

Displays:

territory image

progress indicator

segment checklist

open maps button

save progress button

The checklist should be scrollable.

---

# Admin Screens

Admin screens may contain:

territory list

progress indicators

assignment generation button

Admin tools should remain simple but informative.

---

# Icon Style

Icons should be minimal line icons.

Recommended icon set:

Material Symbols

or

Feather Icons

Avoid heavy or decorative icons.

---

# Interaction Philosophy

The app must always feel:

fast  
clear  
calm  

Users should understand the next action immediately.

Avoid modal dialogs when possible.

Prefer inline actions.

---

# Accessibility

Important because users may interact outdoors.

Requirements:

large tap targets  
high contrast text  
large checkboxes  
simple navigation  

Minimum tap target:

44px

---

# Future Design Extensions

Potential improvements:

territory coverage heatmap

analytics dashboard

territory history visualization

multi congregation dashboards

These features should still follow the minimal design philosophy.