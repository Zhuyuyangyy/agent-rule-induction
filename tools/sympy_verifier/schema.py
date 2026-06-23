"""Schema validation for verifier requests."""

# Known task types and their required fields
TASK_SCHEMAS = {
    "equivalence_check": ["expr", "target_expr"],
    "dimension_check": ["expr", "variables"],
    "canonicalize": ["expr"],
    "limit_check": ["expr", "test_point"],
    "invariant_check": ["expr", "invariants"],
    "complexity_check": ["expr"],
}


def validate_request(request: dict) -> dict:
    """Validate a verifier request dict.

    Checks:
        - task field exists and is a known task type
        - required fields for the task type are present

    Returns:
        dict with valid (bool) and errors (list of strings)
    """
    errors = []

    # Check task field exists
    if "task" not in request:
        errors.append("Missing required field: task")
        return {"valid": False, "errors": errors}

    task = request["task"]

    # Check task is known
    if task not in TASK_SCHEMAS:
        errors.append(f"Unknown task: {task}. Known tasks: {list(TASK_SCHEMAS.keys())}")
        return {"valid": False, "errors": errors}

    # Check required fields
    required_fields = TASK_SCHEMAS[task]
    for field in required_fields:
        if field not in request:
            errors.append(f"Missing required field for {task}: {field}")

    return {"valid": len(errors) == 0, "errors": errors}
