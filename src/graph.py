from langgraph.graph import StateGraph, END
from src.state import SwarmState
from src.agents.watcher import watcher_node
from src.agents.diagnostic import diagnostic_node
from src.agents.execution import execution_node
from src.agents.critic import critic_node
from src.agents.writer import writer_node


def route_watcher_decision(state: SwarmState) -> str:
    """
    Router penentu setelah Watcher Agent memindai data:
    - Jika aman (HEALTHY_NO_ACTION_NEEDED) atau false positive -> langsung STOP (END).
    - Jika ada insiden valid yang butuh perbaikan -> lanjut ke Diagnostic Agent.
    """
    status = state.get("workflow_status")
    if status in ["HEALTHY_NO_ACTION_NEEDED", "NO_DATA_AVAILABLE", "FILTERED_FALSE_POSITIVE"]:
        return END
    return "diagnostic_agent"


def route_critic_decision(state: SwarmState) -> str:
    """
    Router penentu kelanjutan perdebatan:
    - Jika disetujui (APPROVED) -> lanjut ke finalize & writer.
    - Jika sudah mencapai batas iterasi -> lanjut ke finalize & writer (eskalasi).
    - Jika belum disetujui dan masih ada kuota -> kembali ke Execution Agent (Loop).
    """
    review = state.get("critic_review") or {}
    status = review.get("status", "REVISE")
    iteration = state.get("iteration_count", 0)
    max_iter = state.get("max_iterations", 3)

    if status == "APPROVED":
        return "finalize"

    if iteration >= max_iter:
        return "finalize"

    return "execution_agent"


def finalize_node(state: SwarmState) -> dict:
    """
    Node penutup untuk mencatat kesimpulan status akhir sebelum disimpan.
    """
    review = state.get("critic_review") or {}
    status = review.get("status")
    iteration = state.get("iteration_count", 0)
    max_iter = state.get("max_iterations", 3)

    if status == "APPROVED":
        final_status = "APPROVED"
    elif iteration >= max_iter:
        final_status = "ESCALATED_MANUAL_REVIEW"
    else:
        final_status = state.get("workflow_status", "COMPLETED")

    return {"workflow_status": final_status}


def create_swarm_graph():
    workflow = StateGraph(SwarmState)

    # Daftarkan Seluruh Node (Node 1 sampai Node 5)
    workflow.add_node("watcher_agent", watcher_node)
    workflow.add_node("diagnostic_agent", diagnostic_node)
    workflow.add_node("execution_agent", execution_node)
    workflow.add_node("critic_agent", critic_node)
    workflow.add_node("finalize", finalize_node)
    workflow.add_node("writer_agent", writer_node)

    # Entry Point resmi: Watcher Agent (Node 1)
    workflow.set_entry_point("watcher_agent")

    # Alur 1: Watcher -> Diagnostic (atau STOP jika aman)
    workflow.add_conditional_edges(
        "watcher_agent",
        route_watcher_decision,
        {
            "diagnostic_agent": "diagnostic_agent",
            END: END,
        },
    )

    # Alur 2: Diagnostic -> Execution
    workflow.add_edge("diagnostic_agent", "execution_agent")

    # Alur 3: Execution -> Critic
    workflow.add_edge("execution_agent", "critic_agent")

    # Alur 4: Critic -> Loop kembali ke Execution atau lanjut ke Finalize
    workflow.add_conditional_edges(
        "critic_agent",
        route_critic_decision,
        {
            "execution_agent": "execution_agent",
            "finalize": "finalize",
        },
    )

    # Alur 5: Finalize -> Node 5 (Writer Agent) -> END
    workflow.add_edge("finalize", "writer_agent")
    workflow.add_edge("writer_agent", END)

    return workflow.compile()
