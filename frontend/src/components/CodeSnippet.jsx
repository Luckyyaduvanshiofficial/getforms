// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import { useState } from "react"
import { Copy, Check, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"

const BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin

const getHtmlSnippet = (endpoint) => `<form action="${BASE_URL}/f/${endpoint}" method="POST">
  <input type="text" name="name" placeholder="Your name" required />
  <input type="email" name="email" placeholder="Your email" required />
  <textarea name="message" placeholder="Your message" required></textarea>
  <button type="submit">Send</button>
</form>`

const getJsSnippet = (endpoint) => `const formData = {
  name: "John Doe",
  email: "john@example.com",
  message: "Hello from JavaScript!"
};

fetch("${BASE_URL}/f/${endpoint}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(formData)
})
.then(response => response.json())
.then(data => console.log("Success:", data))
.catch(error => console.error("Error:", error));`

const getReactSnippet = (endpoint) => `import { useState } from "react";

function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });
  const [status, setStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");

    try {
      const response = await fetch(
        "${BASE_URL}/f/${endpoint}",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        }
      );

      if (response.ok) {
        setStatus("success");
        setFormData({ name: "", email: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch (error) {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        name="name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Your name"
        required
      />
      <input
        type="email"
        name="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Your email"
        required
      />
      <textarea
        name="message"
        value={formData.message}
        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        placeholder="Your message"
        required
      />
      <button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending..." : "Send"}
      </button>
      {status === "success" && <p>Message sent successfully!</p>}
      {status === "error" && <p>Something went wrong. Please try again.</p>}
    </form>
  );
}`

const getCurlSnippet = (endpoint) => `curl -X POST ${BASE_URL}/f/${endpoint} \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "message": "Hello from cURL!"
  }'`

const getFileUploadSnippet = (endpoint) => `<form action="${BASE_URL}/f/${endpoint}"
      method="POST"
      enctype="multipart/form-data">
  <input type="text" name="name" placeholder="Your name" required />
  <input type="email" name="email" placeholder="Your email" required />
  <textarea name="message" placeholder="Your message"></textarea>

  <!-- Single file upload -->
  <input type="file" name="attachment" accept=".pdf,.doc,.docx,.jpg,.png" />

  <!-- Multiple files -->
  <!-- <input type="file" name="files" multiple /> -->

  <button type="submit">Send with attachment</button>
</form>

<!--
  Supported file types: PDF, Word, Excel, images (JPG, PNG, GIF, WebP), ZIP, TXT, CSV
  Max file size configured via MAX_FILE_SIZE_MB environment variable (default: 10MB)
-->`

export default function CodeSnippet({ endpoint, onSubmissionSent }) {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState("html")
  const [submittingTest, setSubmittingTest] = useState(false)

  const snippets = {
    html: getHtmlSnippet(endpoint),
    javascript: getJsSnippet(endpoint),
    react: getReactSnippet(endpoint),
    curl: getCurlSnippet(endpoint),
    fileupload: getFileUploadSnippet(endpoint),
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeTab])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendTestSubmission = async () => {
    setSubmittingTest(true)
    try {
      const res = await fetch(`${BASE_URL}/f/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _getforms_js: true,
          name: "Test Submitter",
          email: "test@example.com",
          message: "Greetings from the GetForms test submission console! Your endpoint is working perfectly."
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast({
          title: "Test submission received! 🚀",
          description: "Live submission recorded into your inbox.",
        })
        onSubmissionSent?.()
      } else {
        toast({
          title: "Submission failed",
          description: data.error || "Could not record submission",
          variant: "destructive"
        })
      }
    } catch (err) {
      toast({
        title: "Network error",
        description: err.message || "Failed to reach endpoint",
        variant: "destructive"
      })
    } finally {
      setSubmittingTest(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integration Code</CardTitle>
        <CardDescription>
          Copy and paste this code into your website or send a test payload to verify this endpoint immediately
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <TabsList>
              <TabsTrigger value="html">HTML</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="react">React</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="fileupload">File Upload</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendTestSubmission}
                disabled={submittingTest}
                className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
              >
                {submittingTest ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Send Test Submission
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1.5" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>
          </div>

          {Object.entries(snippets).map(([key, code]) => (
            <TabsContent key={key} value={key} className="mt-0">
              <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{code}</code>
              </pre>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
