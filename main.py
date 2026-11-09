import os
import sys

# Pastikan UTF-8 support di terminal Windows
if sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr.encoding.lower() != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8")

from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from src.graph import create_swarm_graph
from src.state import SwarmState

load_dotenv()
console = Console()


def run_swarm_pipeline(target_url: str = ""):
    console.print(
        Panel.fit(
            "[bold cyan]⚡ THE SELF-HEALING AD & SEO SWARM (END-TO-END DAG)[/bold cyan]\n"
            "[yellow]Watcher (Groq 120B) ➜ Diagnostic (Jina/Gemini) ➜ Execution (Gemini) ⚔️ Critic (Groq 120B)[/yellow]",
            border_style="cyan",
        )
    )

    # Inisialisasi State — Watcher Agent yang akan memindai spreadsheet/CSV
    initial_state: SwarmState = {
        "product_name": "",
        "target_url": target_url,
        "issue_type": "",
        "metric_summary": {},
        "diagnostic_data": None,
        "current_draft": None,
        "critic_review": None,
        "iteration_count": 0,
        "max_iterations": 3,
        "debate_history": [],
        "workflow_status": "STARTING",
    }

    console.print("[bold green]✓ Menjalankan Swarm Orchestrator (LangGraph State Machine)...[/bold green]\n")

    app = create_swarm_graph()
    final_output = None
    step_count = 0

    for output in app.stream(initial_state, stream_mode="updates"):
        step_count += 1
        for node_name, node_state in output.items():
            if node_name == "watcher_agent":
                status = node_state.get("workflow_status")
                metric = node_state.get("metric_summary", {})
                
                if status == "HEALTHY_NO_ACTION_NEEDED":
                    console.print(Panel("[bold green]🟢 Watcher Sentinel: Semua metrik dalam kondisi sehat! Tidak ada CTR anjlok > 30%. Swarm berhenti hemat token.[/bold green]", border_style="green"))
                else:
                    table = Table(title="🟢 Node 1: Watcher Agent — Insiden Terdeteksi", border_style="green")
                    table.add_column("Field", style="cyan", width=22)
                    table.add_column("Detail Metrik", style="white")
                    table.add_row("Produk Target", node_state.get("product_name", "-"))
                    table.add_row("Target URL", node_state.get("target_url", "-"))
                    table.add_row("Jenis Insiden", str(node_state.get("issue_type", "-")))
                    table.add_row("Penurunan CTR", f"{metric.get('previous_ctr')} ➜ {metric.get('current_ctr')} ({metric.get('drop_percentage')})")
                    table.add_row("Total Impresi", str(metric.get("impressions", "-")))
                    table.add_row("Status Iklan", metric.get("status", "-"))
                    console.print(table)
                    console.print("[dim]Mengirim URL produk ke Node 2 (Diagnostic Agent)...[/dim]\n")

            elif node_name == "diagnostic_agent":
                diag = node_state.get("diagnostic_data", {})
                
                table = Table(title="🔍 Node 2: Diagnostic Agent — Hasil Bedah URL & Root Cause", border_style="yellow")
                table.add_column("Komponen On-Page", style="cyan", width=22)
                table.add_column("Temuan Hasil Scrape", style="white")
                table.add_row("Scraped Title", diag.get("scraped_title", "-"))
                table.add_row("Scraped H1", diag.get("scraped_h1", "-"))
                table.add_row("Scraped Meta Desc", diag.get("scraped_meta_desc", "-"))
                table.add_row("Detected Price", str(diag.get("detected_price", "-")))
                table.add_row("Search Intent Gap", diag.get("search_intent_gap", "-"))

                flaws = "\n".join([f"• {f}" for f in diag.get("detected_flaws", [])])
                table.add_row("Akar Masalah (Flaws)", flaws)

                console.print(table)
                console.print("[dim]Meneruskan hasil diagnosa ke Node 3 (Execution Agent)...[/dim]\n")

            elif node_name == "execution_agent":
                draft = node_state.get("current_draft", {})
                iter_num = node_state.get("iteration_count", 1)
                
                table = Table(title=f"✍️ Node 3: Execution Agent (Gemini) — Draf Solusi #{iter_num}", border_style="blue")
                table.add_column("Komponen", style="cyan", width=20)
                table.add_column("Isi Konten", style="white")
                table.add_column("Panjang Karakter", style="magenta", width=18)

                title = draft.get("title_tag", "")
                meta = draft.get("meta_description", "")

                table.add_row("Title Tag", title, f"{len(title)} chars (Max 60)")
                table.add_row("Meta Description", meta, f"{len(meta)} chars (120-155)")
                table.add_row("Ad Headline", draft.get("ad_copy_headline", ""), "-")
                table.add_row("Ad Body", draft.get("ad_copy_body", ""), "-")
                table.add_row("Reasoning", draft.get("reasoning", ""), "-")

                console.print(table)
                console.print("[dim]Mengirim draf ke Node 4 (Critic Agent) untuk diaudit...[/dim]\n")

            elif node_name == "critic_agent":
                review = node_state.get("critic_review", {})
                status = review.get("status", "REVISE")
                score = review.get("score", 0)
                color = "green" if status == "APPROVED" else "red"

                panel_content = Text()
                panel_content.append(f"Status Review: ", style="bold")
                panel_content.append(f"{status} (Skor: {score}/100)\n\n", style=f"bold {color}")
                panel_content.append(f"Kritik Evaluator:\n{review.get('critique')}\n\n", style="italic")

                fixes = review.get("required_fixes", [])
                if fixes:
                    panel_content.append("Perbaikan Wajib Sebelum Boleh Publish:\n", style="bold yellow")
                    for fix in fixes:
                        panel_content.append(f"  ✗ {fix}\n", style="yellow")

                console.print(Panel(panel_content, title=f"⚖️ Node 4: Critic Agent (Groq 120B) — Sensor Audit", border_style=color))
                console.print("")

            elif node_name == "finalize":
                final_output = node_state

            elif node_name == "writer_agent":
                console.print(
                    Panel(
                        "[bold green]💾 Node 5: Writer Agent — Hasil Berhasil Diarsipkan![/bold green]\n"
                        "  • [cyan]data/approval_queue.csv[/cyan] ➜ Antrean solusi final siap review\n"
                        "  • [cyan]data/debate_audit_logs.json[/cyan] ➜ Riwayat perdebatan & skor sensor lengkap\n"
                        "  • [dim]Google Sheets / Supabase sync otomatis jika credentials terpasang[/dim]",
                        border_style="green",
                    )
                )

    status_str = final_output.get("workflow_status") if final_output else "COMPLETED"
    border_col = "green" if status_str == "APPROVED" else "yellow"

    console.print(
        Panel.fit(
            f"[bold {border_col}]🏁 SIKLUS SWARM SELESAI![/bold {border_col}]\n"
            f"Hasil Akhir: [bold yellow]{status_str}[/bold yellow]\n"
            f"Total LangGraph Steps: [cyan]{step_count}[/cyan]",
            border_style=border_col,
        )
    )


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Run Self-Healing Ad & SEO Swarm")
    parser.add_argument("--url", type=str, default="", help="Optional specific target URL to heal")
    args = parser.parse_args()
    run_swarm_pipeline(target_url=args.url)
