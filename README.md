# Retrieva AI

# Build a Production-Ready RAG AI Support Assistant

Create a **modern, production-ready, full-stack web application** called **“RAG AI Support Assistant”** — an intelligent customer-support platform powered by **Retrieval-Augmented Generation (RAG)**.

The application should allow an organization to upload its own knowledge documents, process and index them using embeddings, retrieve relevant information when a user asks a question, and generate a **grounded AI response with source citations**.

The final product should feel like a **real commercial SaaS AI support platform**, not a basic chatbot or static UI.

---

# 1. Core Product Goal

The primary workflow is:

**Upload Knowledge → Process Documents → Create Embeddings → Store in Vector Database → Ask Question → Retrieve Relevant Chunks → Generate Grounded Answer → Show Sources**

The AI assistant must:

* Answer questions using the company's knowledge base.
* Retrieve relevant documents before generating answers.
* Clearly show which sources were used.
* Display relevance/confidence information where appropriate.
* Avoid hallucinating information.
* Explicitly state when the required information is not available.
* Support conversation history.
* Provide a polished modern chat experience.
* Be structured so the mock/demo backend can easily be replaced with a production backend.

---

# 2. Technology Stack

Use the following architecture:

### Frontend

* React
* Vite
* Tailwind CSS
* Modern component-based architecture

### Backend

* Node.js
* Express.js

### AI

* OpenAI API
* Embeddings
* LLM-based response generation

### RAG

Use a vector database such as:

* ChromaDB
* Pinecone
* Supabase Vector
* PostgreSQL + pgvector

Choose the most practical option for the implementation and structure the application so it can be replaced later.

### Document Processing

Support:

* PDF
* DOCX
* TXT
* Markdown
* CSV
* Website URLs where practical

---

# 3. CRITICAL API SECURITY

**Never expose the OpenAI API key in the frontend.**

The API key must never appear in:

* React components
* Frontend JavaScript
* Browser local storage
* GitHub repository
* Public configuration files
* UI

Only the backend should communicate with OpenAI.

Use environment variables:

```env
OPENAI_API_KEY=your_api_key_here
VECTOR_DATABASE_URL=your_vector_database_url
```

Create:

```text
.env.example
```

containing:

```env
OPENAI_API_KEY=
VECTOR_DATABASE_URL=
```

Add `.env` to `.gitignore`.

In the Settings UI, never display the actual API key.

Instead show:

**API Key**
`••••••••••••••••`

**Configured securely on server**

---

# 4. Overall Design

Create a premium AI SaaS dashboard.

Visual direction:

* Modern
* Minimal
* Professional
* Enterprise-ready
* AI-focused
* Clean whitespace
* Rounded cards
* Subtle borders
* Soft shadows
* Subtle gradients
* Smooth micro-interactions
* Fast and responsive

The design should feel inspired by modern products such as:

* ChatGPT
* Intercom
* Linear
* Notion AI

But create a **unique visual identity** rather than copying them.

### Color Palette

```text
Background:       #F8FAFC
Primary:          #4F46E5
Secondary:        #7C3AED
Text:             #111827
Muted Text:       #6B7280
Success:          #10B981
Error:            #EF4444
```

Use:

**Inter** or **Plus Jakarta Sans**

Support:

* Light mode
* Dark mode
* Responsive desktop/tablet/mobile layouts

Use glassmorphism sparingly.

---

# 5. Landing Page

Create a professional SaaS landing page.

## Hero Section

Badge:

**✦ Powered by Retrieval-Augmented Generation**

Headline:

**AI Support That Knows Your Business.**

Subheadline:

**Resolve customer questions instantly with a RAG-powered AI assistant trained on your company's knowledge.**

CTA buttons:

**Try AI Assistant**

**Explore Knowledge Base**

On the right side, display an interactive visual mockup of the AI chat interface.

Show a small RAG indicator:

**RAG Enabled**

---

# 6. Landing Page Sections

Include:

### How It Works

Show:

**Upload Documents**
↓
**Build Knowledge Base**
↓
**Ask Questions**
↓
**Retrieve Relevant Context**
↓
**Generate Grounded Answers**

### Key Features

Create feature cards for:

* AI-powered support
* Knowledge-base retrieval
* Source citations
* Document processing
* RAG pipeline
* Human escalation
* Analytics
* Secure API architecture

### RAG Architecture Preview

Show:

**Documents**
→ **Document Loader**
→ **Text Chunking**
→ **Embeddings**
→ **Vector Database**
→ **Retriever**
→ **Relevant Context**
→ **LLM**
→ **AI Response**

### Technology Section

Display technology badges:

* React
* Vite
* Tailwind CSS
* Node.js
* Express
* OpenAI
* Vector Database
* PostgreSQL
* pgvector

---

# 7. Main Dashboard

After entering the application, display a professional dashboard.

## Left Sidebar

Header:

**RAG AI Support Assistant**

Navigation:

* 💬 AI Assistant
* 🕘 Conversations
* 📚 Knowledge Base
* 📄 Documents
* 📊 Analytics
* 🏗️ RAG Architecture
* 🎫 Support Tickets
* ⚙️ Settings

Bottom:

User profile

Example:

**Admin User**
`admin@novatech.com`

---

# 8. System Status

At the bottom of the sidebar or dashboard header, show:

### System Status

🟢 **AI API — Connected**

🟢 **Knowledge Base — Ready**

🟢 **RAG Engine — Active**

If services are unavailable, dynamically show:

🟡 **Demo Mode**

or

🔴 **Service Unavailable**

---

# 9. AI Support Assistant

Create the main AI chat interface.

Header:

**AI Support Assistant**

Subtitle:

**Ask questions about our knowledge base.**

Badge:

**✦ RAG Enabled**

Status:

🟢 Online

---

# 10. Welcome State

Display:

**Hi! I'm your AI Support Assistant.**

**Ask me anything about the information available in the knowledge base.**

Show suggested question cards:

* What services do you provide?
* How can I contact support?
* What is your refund policy?
* Explain the onboarding process.
* How do I reset my password?
* How can I upgrade my plan?

Clicking a suggested question should automatically send it.

---

# 11. Chat Interface

Create a polished modern conversation interface.

User messages should be visually distinct from AI responses.

AI responses should support:

* Markdown
* Lists
* Links
* Code blocks where necessary
* Source citations
* Relevance information

Add:

* Typing indicator
* Streaming AI responses
* Message animation
* Copy response button
* Regenerate response button
* Feedback buttons
* Source expansion

---

# 12. Chat Input

Create a large input box at the bottom.

Placeholder:

**Ask anything about the knowledge base...**

Include:

* Attachment button
* Send button
* Clear conversation button

Keyboard behavior:

**Enter → Send**

**Shift + Enter → New line**

Show loading state while the AI is responding.

Handle API errors gracefully.

---

# 13. RAG Response UI

Every AI response should optionally contain:

### Answer

The generated response.

Then:

### Sources

Display source cards such as:

**📄 Employee_Handbook.pdf**

Page 12

**📄 Support_FAQ.pdf**

Page 4

Each source card should display:

* Document name
* File type
* Page number where available
* Relevant content snippet
* Relevance score
* Expand/preview action

Add:

**✦ Generated using retrieved knowledge**

---

# 14. RAG Pipeline Visualization

Create an expandable section below an AI response:

**How this answer was generated**

When expanded, visually display:

```text
User Question
      ↓
Query Processing
      ↓
Create Query Embedding
      ↓
Vector Similarity Search
      ↓
Relevant Documents
      ↓
Context Retrieval
      ↓
LLM
      ↓
Grounded AI Response
      ↓
Source References
```

Use animated connecting lines and professional cards.

Each retrieved document should display:

* Document title
* Relevance score
* Content snippet
* Source type

Example:

**Password Reset Guide**

**Relevance: 94%**

> To reset your password, navigate to Settings → Security...

---

# 15. RAG Implementation

Implement the actual RAG workflow:

### Step 1

Receive user question.

### Step 2

Create query embedding.

### Step 3

Search the vector database using similarity search.

### Step 4

Retrieve the top relevant chunks.

Default:

```text
topK = 5
```

Make `topK` configurable in Settings.

### Step 5

Build context from retrieved chunks.

### Step 6

Send the context and user question to the LLM.

### Step 7

Generate a grounded response.

### Step 8

Return:

```json
{
  "answer": "...",
  "sources": [],
  "relevance": []
}
```

---

# 16. AI System Prompt

Use a system instruction similar to:

```text
You are a professional customer-support assistant.

Answer questions using only the retrieved knowledge-base context provided to you.

Do not invent, assume, or fabricate information.

If the answer cannot be found in the retrieved context, clearly state that the information is not available in the knowledge base.

When possible, reference the relevant source documents.

Keep responses clear, accurate, concise, and helpful.
```

The assistant must prioritize factual grounding over attempting to answer every question.

---

# 17. Knowledge Base

Create a dedicated:

**Knowledge Base**

page.

Header:

**Knowledge Base**

Description:

**Manage the documents your AI assistant uses to answer questions.**

Show statistics:

* Documents: 24
* Chunks: 1,284
* Embeddings: 1,284
* Last Updated: Today

Primary button:

**+ Upload Document**

---

# 18. Document Upload

Allow users to upload:

* PDF
* DOCX
* TXT
* Markdown
* CSV

Also provide:

**Add Website URL**

where supported.

After upload, execute:

```text
Uploading
↓
Text Extraction
↓
Processing
↓
Chunking
↓
Embedding
↓
Vector Indexing
↓
Ready
```

Display an animated progress indicator.

---

# 19. Document Processing

Implement:

1. Extract document text.
2. Clean the extracted content.
3. Split content into chunks.
4. Generate embeddings.
5. Store embeddings in the vector database.
6. Store metadata.
7. Mark document as indexed.

Metadata should include where possible:

* Document ID
* Document name
* File type
* Page number
* Chunk ID
* Chunk text
* Upload date
* Embedding ID

---

# 20. Documents Page

Create a professional document-management table.

Columns:

| Document | Type | Size | Chunks | Status | Updated | Actions |
| -------- | ---- | ---: | -----: | ------ | ------- | ------- |

Example:

| FAQ.pdf | PDF | 2.4 MB | 82 | Ready | Today | View / Re-index / Delete |
| Policies.docx | DOCX | 1.1 MB | 54 | Ready | Yesterday | View / Re-index / Delete |

Statuses:

🟢 Ready

🟡 Processing

🔴 Failed

Actions:

* View
* Preview
* Search
* Re-index
* Delete

Add:

* Search
* Filters
* Sorting

---

# 21. Document Preview

When a user selects a document, open a preview panel/modal.

Display:

* Document name
* File type
* Upload date
* Number of chunks
* Indexing status
* Extracted content
* Relevant chunks

Allow searching within the document.

---

# 22. No Relevant Information

If the vector search does not find relevant information, the assistant must NOT hallucinate.

Display something like:

**I couldn't find enough information in the knowledge base to answer this accurately.**

Offer:

* **Talk to Human Support**
* **Submit Question**
* **Search Knowledge Base**

---

# 23. Human Escalation

Create a support-ticket workflow.

If:

* No relevant documents are found
* Confidence is below the configured threshold
* User requests human support

show:

**Would you like to speak with a human support agent?**

Buttons:

**Create Support Ticket**

**Continue with AI**

Ticket should contain:

* User question
* AI conversation
* Retrieved sources
* Timestamp
* Status

---

# 24. Conversation History

Create a conversation-history section.

Display:

* Conversation title
* Date
* Last message
* Status

Example:

**Refund Policy Question**
Today

**Password Reset**
Yesterday

**Product Information**
Aug 10

Allow:

* Open conversation
* Rename
* Delete
* Search

---

# 25. Analytics Dashboard

Create:

**Support Analytics**

Overview cards:

* Total Questions
* Questions Today
* Questions Answered
* Resolution Rate
* Average Response Time
* Documents Retrieved
* Knowledge Retrieval Rate
* Human Escalations

Create attractive charts for:

### Questions Over Time

Line chart.

### AI Resolution Rate

Chart showing resolved vs escalated conversations.

### Most Common Questions

Bar chart.

### Knowledge Base Usage

Show most frequently retrieved documents.

### Low-Confidence Questions

Display questions where the RAG system struggled.

---

# 26. Top Customer Questions

Create a section:

**Top Customer Questions**

Example:

1. Password reset
2. Refund policy
3. Subscription upgrade
4. Account verification
5. Payment issues

Show frequency and resolution rate.

---

# 27. Settings

Create a professional settings page.

## AI Configuration

Controls:

* Model
* Temperature
* Maximum response tokens
* System instructions
* Confidence threshold

## RAG Configuration

Controls:

* Chunk size
* Chunk overlap
* Top-K results
* Similarity threshold
* Embedding model
* Vector database

## Support Configuration

Controls:

* Human escalation threshold
* Response disclaimer
* Business hours
* Support email

Use:

* Sliders
* Dropdowns
* Toggles
* Input fields

Do not expose secrets.

Show:

**API Key**

`••••••••••••••••`

**Configured securely on server**

---

# 28. RAG Architecture Page

Create a dedicated:

**RAG Architecture**

page.

Visually explain the complete system:

```text
Documents
     ↓
Document Loader
     ↓
Text Extraction
     ↓
Chunking
     ↓
Embeddings
     ↓
Vector Database
     ↓
Retriever
     ↓
Relevant Context
     ↓
LLM
     ↓
AI Support Response
     ↓
Source Citations
```

Use professional architecture cards and animated connections.

Also display a short explanation for each stage.

---

# 29. Authentication

Create:

* Login
* Sign Up
* Forgot Password
* Google Sign In

After authentication, redirect to:

**AI Support Dashboard**

Structure the application so authentication can later be connected to a real authentication provider.

---

# 30. Demo Mode

The application must remain usable when external services are not configured.

If no API key or vector database is available, automatically enable:

**Demo Mode**

Display a subtle badge:

**Demo Mode**

Use realistic sample documents and responses.

Example company:

**NovaTech**

Demo documents:

* NovaTech Product Guide
* NovaTech FAQ
* Refund & Cancellation Policy
* Account Security Guide
* Pricing Documentation

Example question:

**Can I get a refund after upgrading my plan?**

Example grounded response:

**According to NovaTech's Refund & Cancellation Policy, eligible customers can request a refund within 14 days of upgrading their plan.**

Source:

**📄 Refund & Cancellation Policy — 96% relevance**

Make it obvious that demo responses are sample data rather than live AI results.

---

# 31. Backend API

Create a clean backend API structure.

Required endpoints:

```text
POST   /api/chat

POST   /api/documents/upload

GET    /api/documents

GET    /api/documents/:id

DELETE /api/documents/:id

POST   /api/documents/:id/reindex

GET    /api/search

GET    /api/analytics

GET    /api/health

POST   /api/tickets

GET    /api/tickets
```

The `/api/chat` endpoint should:

1. Receive the question.
2. Generate query embedding.
3. Search the vector database.
4. Retrieve relevant chunks.
5. Build context.
6. Send context + question to the LLM.
7. Generate grounded response.
8. Return answer + sources + relevance information.

---

# 32. API Service Architecture

Keep frontend and backend clearly separated.

Example structure:

```text
project/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── utils/
│   └── ...
│
├── backend/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── rag/
│   ├── embeddings/
│   ├── vectorstore/
│   ├── document-processing/
│   └── server.js
│
├── .env.example
├── .gitignore
└── README.md
```

Use a service layer so the frontend does not directly communicate with OpenAI.

---

# 33. Error Handling

Handle errors gracefully.

Support:

* Invalid API key
* OpenAI API failure
* API timeout
* Network failure
* Empty knowledge base
* No relevant documents
* Unsupported file type
* File too large
* Document processing failure
* Embedding failure
* Vector database failure
* Authentication failure

Never display raw stack traces to users.

Use friendly messages such as:

**“We couldn't process this document. Please try again.”**

---

# 34. Loading States

Implement polished loading states for:

* AI response generation
* Streaming responses
* Document upload
* Document processing
* Embedding generation
* Vector indexing
* Analytics loading
* Page navigation

Use:

* Skeleton loaders
* Progress indicators
* Typing animation
* Animated status indicators

---

# 35. Empty States

Create polished empty states.

### Chat

**Your AI assistant is ready.**

**Ask a question about your knowledge base to get started.**

### Knowledge Base

**No documents yet.**

**Upload your first document to start building your AI knowledge base.**

### Documents

**Upload documents to give your AI assistant knowledge.**

### Conversations

**No conversations yet.**

### Analytics

**Analytics will appear after your assistant receives questions.**

---

# 36. Responsive Design

The application must work properly on:

* Desktop
* Laptop
* Tablet
* Mobile

On mobile:

* Convert sidebar into a drawer
* Keep chat input fixed at the bottom
* Make tables horizontally scrollable or convert them into cards
* Optimize charts
* Maintain readable typography

---

# 37. Accessibility

Follow good accessibility practices:

* Semantic HTML
* Keyboard navigation
* Visible focus states
* Accessible buttons
* ARIA labels where needed
* Sufficient contrast
* Screen-reader-friendly components

---

# 38. Animations

Use subtle professional animations for:

* Chat message appearance
* AI typing indicator
* Source expansion
* Sidebar navigation
* Page transitions
* Document processing
* RAG pipeline connections
* Hover states
* Loading states

Avoid excessive animations.

The product should feel **fast and professional**.

---

# 39. Security

Follow secure development practices.

* Never expose API keys.
* Validate uploaded files.
* Restrict supported file types.
* Enforce upload size limits.
* Sanitize extracted content.
* Validate API requests.
* Keep secrets in environment variables.
* Do not expose internal errors.
* Separate frontend and backend.
* Add basic rate limiting where appropriate.
* Do not store sensitive credentials in the browser.

---

# 40. Production Documentation

Include:

### README.md

Document:

1. Project overview
2. Features
3. Technology stack
4. Installation
5. Environment variables
6. Running frontend
7. Running backend
8. Vector database setup
9. OpenAI configuration
10. Document processing
11. RAG architecture
12. API documentation
13. Demo mode
14. Production deployment

Also include:

```text
.env.example
.gitignore
```

---

# 41. Final User Experience

The application should communicate one simple idea immediately:

> **“This AI answers customer questions using my company's own knowledge.”**

The main experience should be:

**Upload Knowledge**

↓

**Build Vector Index**

↓

**Ask Question**

↓

**Retrieve Relevant Information**

↓

**Generate Grounded Answer**

↓

**Show Sources**

↓

**Escalate to Human if Necessary**

---

# 42. Final Quality Requirements

Do NOT create only a static frontend mockup.

Build a **complete working application architecture** with:

* Functional React frontend
* Functional Node/Express backend
* RAG service architecture
* Document upload flow
* Document processing pipeline
* Vector-search architecture
* OpenAI integration
* Source citations
* Conversation history
* Analytics
* Settings
* Human escalation
* Demo Mode
* Error handling
* Responsive design
* Secure environment configuration

Where external services cannot be configured automatically, implement clean adapters/interfaces and **Demo Mode** so the complete UI and workflow can still be tested.

Prioritize:

**Excellent UI + real RAG architecture + grounded AI responses + source citations + knowledge-base management + security + scalability + production readiness.**

The finished application should look and behave like a **commercial AI customer-support SaaS product** rather than a college-level chatbot demo.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://retrievaai.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ccee716c-e074-4e08-ba16-c5acd4add2f2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
