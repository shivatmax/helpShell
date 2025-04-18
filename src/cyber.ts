/**
 * Cybersecurity specialist functionality for Terminal AI
 */

import { type Config } from "./config"

export interface CyberTool {
  name: string;
  description: string;
  category: string;
}

export interface CyberSecurityInfo {
  tools: CyberTool[];
  resources: string[];
}

/**
 * List of common cybersecurity tools to enhance the AI's knowledge base
 */
export const cyberSecurityTools: CyberTool[] = [
  { 
    name: "Nmap", 
    description: "Network discovery and security auditing", 
    category: "reconnaissance" 
  },
  { 
    name: "Wireshark", 
    description: "Network protocol analyzer", 
    category: "analysis" 
  },
  { 
    name: "Metasploit", 
    description: "Penetration testing framework", 
    category: "exploitation" 
  },
  { 
    name: "OWASP ZAP", 
    description: "Web application security scanner", 
    category: "web-security" 
  },
  { 
    name: "Burp Suite", 
    description: "Web vulnerability scanner and tester", 
    category: "web-security" 
  },
  { 
    name: "Aircrack-ng", 
    description: "WiFi security auditing", 
    category: "wireless" 
  },
  { 
    name: "John the Ripper", 
    description: "Password cracker", 
    category: "password" 
  },
  { 
    name: "Hashcat", 
    description: "Advanced password recovery", 
    category: "password" 
  },
  { 
    name: "Hydra", 
    description: "Login cracker", 
    category: "brute-force" 
  },
  { 
    name: "Nikto", 
    description: "Web server scanner", 
    category: "web-security" 
  }
];

/**
 * Educational cybersecurity resources
 */
export const cyberSecurityResources: string[] = [
  "OWASP Top 10",
  "MITRE ATT&CK Framework",
  "NIST Cybersecurity Framework",
  "HackTheBox",
  "TryHackMe",
  "PortSwigger Web Security Academy",
  "Awesome Hacking (GitHub)",
  "Exploit-DB",
  "CVE Database",
  "SANS Internet Storm Center"
];

/**
 * Get cybersecurity information, including tools and resources
 */
export function getCyberSecurityInfo(): CyberSecurityInfo {
  return {
    tools: cyberSecurityTools,
    resources: cyberSecurityResources
  };
}

/**
 * Format a query specifically for cybersecurity context
 */
export function formatCyberQuery(query: string): string {
  // Add cybersecurity context to the query
  return `[CYBERSECURITY CONTEXT] ${query}`;
}

/**
 * Validate if a query is cybersecurity related
 * This is a simple implementation that could be enhanced with more sophisticated checks
 */
export function isCyberSecurityQuery(query: string): boolean {
  const cyberKeywords = [
    'hack', 'exploit', 'vulnerability', 'security', 'cyber', 'pentest', 
    'penetration', 'threat', 'malware', 'virus', 'trojan', 'phishing', 
    'ransomware', 'firewall', 'encryption', 'decrypt', 'authentication', 
    'password', 'breach', 'attack', 'defense', 'protect', 'secure', 'CVE',
    'CVSS', 'buffer overflow', 'injection', 'XSS', 'CSRF', 'SSRF', 'OWASP',
    'reverse shell', 'payload', 'backdoor', 'rootkit', 'keylogger',
    'forensic', 'incident response', 'sniffing', 'spoofing', 'mitm'
  ];
  
  const lowercaseQuery = query.toLowerCase();
  
  return cyberKeywords.some(keyword => 
    lowercaseQuery.includes(keyword.toLowerCase())
  );
} 