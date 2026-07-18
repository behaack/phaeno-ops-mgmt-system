**Effective Date: November 21, 2025**

Phaeno Inc. (“Phaeno”, “we”, “us”) operates a secure, research-only bioinformatics analysis platform. This policy describes how we protect, retain, and back up customer data (account information, uploaded sequencing files, analysis results, and associated metadata).

#### 1. Scope
This policy applies to all data you upload or generate on portal.phaenobiotech.com and any subdomains.

We do **not** process clinical samples, protected health information (PHI), or directly identifiable human data. You remain solely responsible for ensuring that any human-origin data is properly de-identified or anonymized before shipping your samples or uploading information.

#### 2. Data Security Measures

##### 2.1 Encryption
- **In transit**: All connections use TLS 1.3 with strong cipher suites.
- **At rest**: Customer-uploaded files and databases are encrypted using AES-256.

##### 2.2 Access Controls
- Role-based access control (RBAC) with least-privilege principle.
- Multi-factor authentication (MFA) required for all Phaeno staff and contractors.
- Session timeouts and automatic log-off.

##### 2.3 Network & Infrastructure Security
- Production systems hosted on Amazon Web Services (AWS) in the United States (us-west-2 region).
- VPC isolation, security groups, and Web Application Firewall (WAF).
- Regular third-party penetration testing and vulnerability scanning.
- DDoS protection via AWS Shield.

##### 2.4 Logging & Monitoring
- All access and administrative actions are logged and retained for at least 12 months.
- Real-time alerting on suspicious activity via AWS GuardDuty and custom SIEM rules.

##### 2.5 Third-Party Providers
We only use subprocessors that maintain SOC 2 Type II, ISO 27001, or equivalent certifications. Current key subprocessors:
- Amazon Web Services (compute & storage)
- Google Cloud (limited analytics services – no customer data stored)
- Auth0 / Okta (identity and access management)

#### 3. Data Retention Policy

<table style="width: 100%; border-collapse: collapse; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; margin: 20px 0;">
  <thead>
    <tr style="background-color: #f8f9fa; text-align: left;">
      <th style="padding: 14px; border-bottom: 2px solid #dee2e6;">Data Type</th>
      <th style="padding: 14px; border-bottom: 2px solid #dee2e6;">Default Retention Period</th>
      <th style="padding: 14px; border-bottom: 2px solid #dee2e6;">Deletion / Extension Options</th>
    </tr>
  </thead>
  <tbody>
    <tr style="background-color: #ffffff;">
      <td style="padding: 14px; border-bottom: 1px solid #dee2e6; font-weight: 600;">Account data<br><small>(name, email, billing)</small></td>
      <td style="padding: 14px; border-bottom: 1px solid #dee2e6;">Until account deletion + 7 years<br><small>(legal/tax requirements)</small></td>
      <td style="padding: 14px; border-bottom: 1px solid #dee2e6;">Immediate deletion on request<br><small>(subject to legal holds)</small></td>
    </tr>
    <tr style="background-color: #f8f9fa;">
      <td style="padding: 14px; border-bottom: 1px solid #dee2e6; font-weight: 600;">Uploaded files & metadata</td>
      <td style="padding: 14px; border-bottom: 1px solid #dee2e6;">180 days after project completion or last activity</td>
      <td style="padding: 14px; border-bottom: 1px solid #dee2e6;">Users may extend up to 2 years or request immediate deletion</td>
    </tr>
    <tr style="background-color: #ffffff;">
      <td style="padding: 14px; border-bottom: 1px solid #dee2e6; font-weight: 600;">Analysis results & reports</td>
      <td style="padding: 14px; border-bottom: 1px solid #dee2e6;">Same as uploaded files (180 days default)</td>
      <td style="padding: 14px; border-bottom: 1px solid #dee2e6;">Same extension/deletion options as uploaded files</td>
    </tr>
    <tr style="background-color: #f8f9fa;">
      <td style="padding: 14px; border-bottom: 1px solid #dee2e6; font-weight: 600;">Logs<br><small>(audit, access, error)</small></td>
      <td style="padding: 14px; border-bottom: 1px solid #dee2e6;">12 months</td>
      <td style="padding: 14px; border-bottom: 1px solid #dee2e6;">Automatic deletion after 12 months</td>
    </tr>
    <tr style="background-color: #ffffff;">
      <td style="padding: 14px; font-weight: 600;">Backups</td>
      <td style="padding: 14px;">35 days (daily snapshots)</td>
      <td style="padding: 14px;">Not user-accessible; used only for disaster recovery</td>
    </tr>
  </tbody>
</table>

You may delete your projects and files at any time via the portal. Upon deletion, data is immediately removed from active systems and overwritten in backups within 35 days.

#### 4. Backup & Disaster Recovery
- Daily encrypted backups of all customer data and databases.
- Backups stored in a separate AWS region (us-east-1) with immutable (object-lock) protection.
- Recovery Time Objective (RTO): ≤ 4 hours
- Recovery Point Objective (RPO): ≤ 24 hours
- Annual disaster recovery testing with documented results.

#### 5. Data Breach Response
In the unlikely event of a confirmed personal data breach, we will:
1. Notify affected users without undue delay (and no later than 72 hours after becoming aware where required by law).
2. Notify relevant supervisory authorities as required (e.g., ICO, CNIL, state attorneys general).
3. Maintain a detailed incident response plan reviewed annually.

#### 6. Your Responsibilities
- Keep your password and API keys confidential.
- Enable MFA on your account.
- Ensure any human-origin data is properly de-identified before upload.
- Promptly report any suspected security incident to info@phaenobiotech.com.

#### 7. Changes to This Policy
We may update this policy from time to time. Material changes will be communicated via email and a banner in the portal. Continued use of the service after changes constitutes acceptance.

**Contact Us**  
Security or policy questions: info@phaenobiotech.com  
Data deletion or retention requests: info@phaenobiotech.com  
General inquiries: info@phaenobiotech.com

Phaeno Inc.  
5270 California Avenue, Suite 300  
Irvine, CA 92617, USA