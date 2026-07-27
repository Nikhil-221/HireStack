from typing import Optional

def generate_job_description(
    title: str,
    department: Optional[str] = None,
    employment_type: Optional[str] = None,
    experience_required: Optional[str] = None,
) -> dict:
    department_text = department or "our team"
    experience_text = experience_required or "relevant"
    employment_text = employment_type or "Full-time"

    description = (
        f"We are looking for a talented {title} to join {department_text} on a "
        f"{employment_text} basis. The ideal candidate has {experience_text} experience "
        f"and is passionate about solving real-world problems, collaborating with "
        f"cross-functional teams, and delivering high-quality work."
    )

    responsibilities = [
        f"Design, build, and maintain solutions as a {title}",
        "Collaborate with cross-functional teams to define and ship new features",
        "Write clean, maintainable, and well-tested code",
        "Participate in code reviews and technical design discussions",
        "Troubleshoot and resolve production issues in a timely manner",
    ]

    required_skills = [
        "Strong problem-solving and analytical skills",
        "Good communication and collaboration skills",
        "Solid understanding of software development fundamentals",
    ]

    preferred_skills = [
        "Prior experience in a similar role",
        "Exposure to agile development practices",
    ]

    qualifications = [
        "Bachelor's degree in Computer Science, Engineering, or a related field (or equivalent experience)",
        f"{experience_text} of professional experience in a relevant role",
    ]

    return {
        "description": description,
        "responsibilities": responsibilities,
        "required_skills": required_skills,
        "preferred_skills": preferred_skills,
        "qualifications": qualifications,
    }
