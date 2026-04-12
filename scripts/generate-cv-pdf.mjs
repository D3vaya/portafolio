import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Link,
  Image,
  StyleSheet,
  Font,
  renderToFile,
} from "@react-pdf/renderer";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cv = JSON.parse(
  readFileSync(join(__dirname, "..", "cv.json"), "utf-8")
);

const ACCENT_GREEN = "#0d9668";
const DARK_BG = "#0a0a0a";
const profileImagePath = join(__dirname, "..", "public", "perfil2.jpeg");

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    color: "#1a1a1a",
  },
  header: {
    backgroundColor: DARK_BG,
    padding: 20,
    marginBottom: 12,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  headerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: ACCENT_GREEN,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 20,
    color: ACCENT_GREEN,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
  },
  headerLabel: {
    fontSize: 10,
    color: "#ffffff",
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    fontSize: 8,
    color: "#cccccc",
  },
  contactLink: {
    color: ACCENT_GREEN,
    textDecoration: "none",
    fontSize: 8,
  },
  summarySection: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  summaryText: {
    fontSize: 8.5,
    lineHeight: 1.5,
    color: "#333333",
  },
  twoCol: {
    flexDirection: "row",
    gap: 14,
  },
  leftCol: {
    width: "63%",
  },
  rightCol: {
    width: "37%",
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    borderLeftWidth: 3,
    borderLeftColor: ACCENT_GREEN,
    paddingLeft: 8,
    marginBottom: 8,
    marginTop: 10,
    color: DARK_BG,
    textTransform: "uppercase",
  },
  jobEntry: {
    marginBottom: 8,
    flexDirection: "row",
    gap: 8,
  },
  jobLogoWrap: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: "#ffffff",
    borderWidth: 0.5,
    borderColor: "#e0e0e0",
    padding: 3,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  jobLogo: {
    width: 22,
    height: 22,
    objectFit: "contain",
  },
  jobContent: {
    flex: 1,
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  jobCompany: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
  },
  jobDate: {
    fontSize: 7.5,
    color: "#666666",
  },
  jobPosition: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Oblique",
    color: "#444444",
    marginBottom: 3,
  },
  jobSummary: {
    fontSize: 7.5,
    lineHeight: 1.4,
    color: "#555555",
    marginBottom: 3,
  },
  jobHighlight: {
    fontSize: 7,
    lineHeight: 1.4,
    color: "#444444",
    marginLeft: 6,
  },
  skillGroup: {
    marginBottom: 6,
  },
  skillLevel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: DARK_BG,
    marginBottom: 3,
  },
  skillTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
  },
  skillTag: {
    fontSize: 7,
    backgroundColor: "#f0f0f0",
    borderWidth: 0.5,
    borderColor: "#d0d0d0",
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    color: "#333333",
  },
  skillTagMaster: {
    backgroundColor: "#e6fff5",
    borderColor: ACCENT_GREEN,
    color: "#006b3f",
  },
  eduEntry: {
    marginBottom: 5,
  },
  eduInstitution: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
  },
  eduArea: {
    fontSize: 8,
    color: "#444444",
  },
  eduDate: {
    fontSize: 7,
    color: "#888888",
  },
  projectsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  projectCard: {
    width: "48%",
    padding: 6,
    borderWidth: 0.5,
    borderColor: "#e0e0e0",
    borderRadius: 3,
    backgroundColor: "#fafafa",
  },
  projectName: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: DARK_BG,
    marginBottom: 2,
  },
  projectDesc: {
    fontSize: 7,
    color: "#666666",
    lineHeight: 1.3,
  },
  projectUrl: {
    fontSize: 6.5,
    color: ACCENT_GREEN,
    textDecoration: "none",
    marginTop: 2,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 7,
    color: "#aaaaaa",
    borderTopWidth: 0.5,
    borderTopColor: "#e0e0e0",
    paddingTop: 6,
  },
});

function formatDate(dateStr) {
  if (!dateStr) return "Presente";
  const months = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];
  const [year, month] = dateStr.split("-");
  return `${months[parseInt(month, 10) - 1]} ${year}`;
}

function groupSkills(skills) {
  const groups = { Master: [], Avanzado: [], Medio: [] };
  const seen = new Set();
  for (const skill of skills) {
    const level = skill.level;
    if (groups[level] && !seen.has(skill.name)) {
      seen.add(skill.name);
      groups[level].push(skill.name);
    }
  }
  return groups;
}

const { basics, work, education, skills, projects, languages, certificates } = cv;
const skillGroups = groupSkills(skills);
const publicDir = join(__dirname, "..", "public");

function resolveImage(imagePath) {
  if (!imagePath) return null;
  if (imagePath.endsWith(".svg")) return null;
  const filePath = join(publicDir, imagePath);
  try {
    readFileSync(filePath);
    return filePath;
  } catch {
    return null;
  }
}

const CVDocument = () =>
  React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },

      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Image, {
          style: styles.headerImage,
          src: profileImagePath,
        }),
        React.createElement(
          View,
          { style: styles.headerInfo },
          React.createElement(Text, { style: styles.headerName }, basics.name),
          React.createElement(Text, { style: styles.headerLabel }, basics.label),
          React.createElement(
            View,
            { style: styles.contactRow },
            React.createElement(Text, null, basics.email),
            React.createElement(Text, null, basics.phone),
            React.createElement(
              Text,
              null,
              `${basics.location.city}, ${basics.location.region}`
            ),
            ...basics.profiles.map((p) =>
              React.createElement(
                Link,
                { key: p.network, src: p.url, style: styles.contactLink },
                p.network
              )
            )
          )
        )
      ),

      // Summary
      React.createElement(
        View,
        { style: styles.summarySection },
        React.createElement(
          Text,
          { style: styles.sectionTitle },
          "Perfil Profesional"
        ),
        React.createElement(Text, { style: styles.summaryText }, basics.summary)
      ),

      // Two columns
      React.createElement(
        View,
        { style: styles.twoCol },

        // Left column - Experience
        React.createElement(
          View,
          { style: styles.leftCol },
          React.createElement(
            Text,
            { style: styles.sectionTitle },
            "Experiencia Laboral"
          ),
          ...work.map((job) => {
            const logoPath = resolveImage(job.image);
            return React.createElement(
              View,
              { key: `${job.name}-${job.startDate}`, style: styles.jobEntry },
              React.createElement(
                View,
                { style: styles.jobLogoWrap },
                logoPath
                  ? React.createElement(Image, {
                      style: styles.jobLogo,
                      src: logoPath,
                    })
                  : null
              ),
              React.createElement(
                View,
                { style: styles.jobContent },
                React.createElement(
                  View,
                  { style: styles.jobHeader },
                  React.createElement(
                    Text,
                    { style: styles.jobCompany },
                    job.name
                  ),
                  React.createElement(
                    Text,
                    { style: styles.jobDate },
                    `${formatDate(job.startDate)} - ${formatDate(job.endDate)}`
                  )
                ),
                React.createElement(
                  Text,
                  { style: styles.jobPosition },
                  job.position
                ),
                React.createElement(
                  Text,
                  { style: styles.jobSummary },
                  job.summary
                ),
                ...(Array.isArray(job.highlights) && job.highlights.length && job.highlights[0] !== "Started the company"
                  ? job.highlights.map((h, i) =>
                      React.createElement(
                        Text,
                        { key: `h-${i}`, style: styles.jobHighlight },
                        `• ${h}`
                      )
                    )
                  : [])
              )
            );
          })
        ),

        // Right column - Skills + Education
        React.createElement(
          View,
          { style: styles.rightCol },
          React.createElement(
            Text,
            { style: styles.sectionTitle },
            "Habilidades"
          ),
          ...Object.entries(skillGroups)
            .filter(([, items]) => items.length > 0)
            .map(([level, items]) =>
              React.createElement(
                View,
                { key: level, style: styles.skillGroup },
                React.createElement(
                  Text,
                  { style: styles.skillLevel },
                  level
                ),
                React.createElement(
                  View,
                  { style: styles.skillTags },
                  ...items.map((name) =>
                    React.createElement(
                      Text,
                      {
                        key: name,
                        style: [
                          styles.skillTag,
                          level === "Master" && styles.skillTagMaster,
                        ],
                      },
                      name
                    )
                  )
                )
              )
            ),

          React.createElement(
            Text,
            { style: styles.sectionTitle },
            "Educacion"
          ),
          ...education.map((edu) =>
            React.createElement(
              View,
              { key: `${edu.institution}-${edu.area}`, style: styles.eduEntry },
              React.createElement(
                Text,
                { style: styles.eduInstitution },
                edu.institution
              ),
              React.createElement(
                Text,
                { style: styles.eduArea },
                edu.area
              ),
              React.createElement(
                Text,
                { style: styles.eduDate },
                `${formatDate(edu.startDate)} - ${formatDate(edu.endDate)}`
              )
            )
          ),

          React.createElement(
            Text,
            { style: styles.sectionTitle },
            "Idiomas"
          ),
          ...languages.map((lang) =>
            React.createElement(
              View,
              { key: lang.language, style: styles.eduEntry },
              React.createElement(
                Text,
                { style: styles.eduInstitution },
                lang.language
              ),
              React.createElement(
                Text,
                { style: styles.eduArea },
                lang.fluency
              )
            )
          ),

          React.createElement(
            Text,
            { style: styles.sectionTitle },
            "Certificaciones"
          ),
          ...certificates.map((cert) =>
            React.createElement(
              View,
              { key: cert.name, style: styles.eduEntry },
              React.createElement(
                Text,
                { style: styles.eduInstitution },
                cert.name
              ),
              React.createElement(
                Text,
                { style: styles.eduArea },
                cert.issuer
              )
            )
          )
        )
      ),

      // Footer
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(
          Text,
          null,
          `${basics.name} · ${basics.email} · ${basics.location.city}, ${basics.location.region}`
        )
      )
    )
  );

const outputPath = join(__dirname, "..", "public", "cv-juan-carlos-ayala.pdf");
await renderToFile(React.createElement(CVDocument), outputPath);
console.log(`CV PDF generated: ${outputPath}`);
