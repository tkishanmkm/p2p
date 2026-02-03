import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
  } from "@/components/ui/accordion"
  
  const faqs = [
    {
      question: "What is TradeFlow?",
      answer: "TradeFlow is a peer-to-peer (P2P) cryptocurrency trading platform that allows users to buy and sell crypto directly with each other. We provide a secure escrow service to protect both parties during a transaction."
    },
    {
      question: "How does the escrow service work?",
      answer: "When a trade is initiated, the seller's cryptocurrency is locked in our secure escrow system. The seller can only release the crypto to the buyer after they have confirmed receipt of payment. This prevents scams and ensures that both parties fulfill their obligations."
    },
    {
      question: "What are the fees for using TradeFlow?",
      answer: "We charge a small, transparent fee on completed trades. The exact fee is displayed before you confirm a trade. There are no hidden charges for depositing or withdrawing crypto from your TradeFlow wallet."
    },
    {
      question: "What payment methods are supported?",
      answer: "TradeFlow supports hundreds of payment methods from over 180 countries. These can include bank transfers, online wallets, and other local payment options. You can filter ads by your preferred payment method to find a suitable trade partner."
    },
    {
        question: "What happens if there is a dispute?",
        answer: "If a problem arises during a trade (e.g., the buyer has paid but the seller won't release the crypto), either party can open a dispute. Our moderation team will investigate the issue by reviewing the trade chat and payment evidence, and will make a fair decision to award the crypto to the rightful party."
    },
    {
        question: "How long do I have to make a payment?",
        answer: "The payment window is set by the ad creator. Typically, it is between 15 to 60 minutes. If you fail to mark the trade as 'Paid' within this window, the trade will automatically expire, and the crypto will be returned to the seller."
    },
    {
        question: "Is my personal information safe?",
        answer: "Yes, we take security and privacy very seriously. We use industry-standard encryption for sensitive data and only share necessary information (like your username) with your trade partner. Please refer to our Privacy Policy for detailed information."
    }
  ]
  
  export default function FAQPage() {
    return (
      <div className="prose dark:prose-invert max-w-4xl mx-auto">
        <h1>Frequently Asked Questions</h1>
        <p className="lead">Find answers to common questions about using the TradeFlow platform.</p>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    )
  }
