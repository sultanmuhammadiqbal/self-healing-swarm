from typing import Any, Dict, List, Literal, Optional
from typing_extensions import TypedDict
from pydantic import BaseModel, Field


class CriticFeedback(BaseModel):
    status: Literal["APPROVED", "REVISE"] = Field(description="Must be strictly 'APPROVED' or 'REVISE'")
    score: int = Field(ge=1, le=100, description="Score from 1 to 100")
    critique: str = Field(min_length=10, description="Detailed critique explaining why it passed or failed")
    required_fixes: List[str] = Field(default_factory=list, description="Specific action items if status is REVISE")


class DiagnosticResult(BaseModel):
    scraped_title: str = Field(description="Title tag yang ada di halaman live")
    scraped_h1: str = Field(description="Heading H1 utama di halaman live")
    scraped_meta_desc: str = Field(description="Meta description di halaman live")
    detected_price: Optional[str] = Field(default=None, description="Harga yang ditemukan di halaman")
    schema_detected: bool = Field(default=False, description="Apakah schema Product / JSON-LD terdeteksi")
    detected_flaws: List[str] = Field(default_factory=list, description="Kelemahan SEO on-page yang ditemukan")
    key_features: List[str] = Field(default_factory=list, description="Fitur/keunggulan produk yang diekstrak dari halaman")
    search_intent_gap: str = Field(description="Analisa kenapa halaman ini kalah saing atau CTR anjlok")


class ProposedSolution(BaseModel):
    title_tag: str = Field(description="Optimized Title Tag / Headline (strictly <= 60 chars)")
    meta_description: str = Field(description="Optimized Meta Description (strictly 120-155 chars)")
    ad_copy_headline: str = Field(description="Punchy ad headline highlighting UVP/promo")
    ad_copy_body: str = Field(description="Persuasive ad copy with strong call to action")
    schema_json_ld: str = Field(description="Valid JSON-LD Product schema string with name, price, currency, and availability")
    reasoning: str = Field(description="Why this change addresses the diagnosis and critic feedback")


class SwarmState(TypedDict):
    # Data input dari Sheets / monitoring
    product_name: str
    target_url: str
    issue_type: str  # e.g., "CTR_DROP", "ROAS_DROP", "DISAPPROVED_MERCHANT"
    metric_summary: Dict[str, Any]

    # Hasil analisa Diagnostic Agent
    diagnostic_data: Optional[Dict[str, Any]]

    # Hasil draf dari Execution Agent
    current_draft: Optional[Dict[str, Any]]

    # Review dari Critic Agent
    critic_review: Optional[Dict[str, Any]]

    # Loop control untuk debat antar agent
    iteration_count: int
    max_iterations: int

    # Histori perdebatan untuk log & audit trail Supabase
    debate_history: List[Dict[str, Any]]

    # Status final workflow
    workflow_status: str  # "IN_PROGRESS", "APPROVED", "ESCALATED_MANUAL_REVIEW"
