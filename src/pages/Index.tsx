import { PublicNavigation } from "@/components/PublicNavigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Zap, Church, School, MessageCircle, CheckCircle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <PublicNavigation />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        <div className="container relative mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge className="text-sm px-4 py-2" variant="secondary">
              🎉 Free for Your First 3 Months
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              Every Purchase Your Community Makes{" "}
              <span className="text-primary">Could Be Earning You Money</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              We share the deals. You share with your WhatsApp groups. 
              Everyone earns from every purchase. Zero upfront cost.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button size="lg" className="text-lg px-8 py-6 h-auto" asChild>
                <a href="/auth">Start Free Trial</a>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 h-auto" asChild>
                <a href="#how-it-works">See How It Works</a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Then $99/month after trial • We only earn when you earn
            </p>
          </div>
        </div>
      </section>

      {/* Target Audiences */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Perfect For Communities That Care
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Trusted by organizations looking to support their mission through ethical affiliate income
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="text-center border-2 hover:border-primary/50 transition-all">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Church className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Religious Organizations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Fund your mission while serving your congregation with valuable deals
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 hover:border-primary/50 transition-all">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <School className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Schools & PTAs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Generate funds for programs without traditional fundraising
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 hover:border-primary/50 transition-all">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Influencers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Monetize your community with curated deals they'll love
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple. Automated. Profitable.
            </h2>
            <p className="text-xl text-muted-foreground">
              Three steps to passive income for your community
            </p>
          </div>
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2">Create Your WhatsApp Groups</h3>
                <p className="text-lg text-muted-foreground">
                  Set up WhatsApp groups for your community members. We provide the setup guide and best practices.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2">We Post Curated Deals Daily</h3>
                <p className="text-lg text-muted-foreground">
                  Our team finds the best deals on Amazon and posts them directly to your groups. No work required from you.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2">Earn From Every Purchase</h3>
                <p className="text-lg text-muted-foreground">
                  When your community buys through the links, you earn commissions. We track everything and handle the payments.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Why Communities Choose Relay Station
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-lg mb-1">Zero Setup Hassle</h4>
                  <p className="text-muted-foreground">We handle all the technical details, deal sourcing, and link management</p>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-lg mb-1">Transparent Tracking</h4>
                  <p className="text-muted-foreground">Real-time analytics show exactly how much you're earning</p>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-lg mb-1">Quality Deals Only</h4>
                  <p className="text-muted-foreground">Hand-picked products your community will actually want</p>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-lg mb-1">Revenue Sharing Model</h4>
                  <p className="text-muted-foreground">We only take a small percentage—your success is our success</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Card className="border-2 border-primary/50 shadow-xl">
              <CardHeader className="text-center pb-8">
                <Badge className="mx-auto mb-4 text-sm px-4 py-2" variant="secondary">
                  Limited Time Offer
                </Badge>
                <CardTitle className="text-3xl md:text-4xl mb-4">
                  Get Started Free for 3 Months
                </CardTitle>
                <CardDescription className="text-lg">
                  Experience the full platform with zero commitment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="text-center">
                  <div className="text-5xl md:text-6xl font-bold mb-2">
                    $0
                    <span className="text-2xl text-muted-foreground font-normal">/month</span>
                  </div>
                  <p className="text-muted-foreground mb-1">For your first 3 months</p>
                  <p className="text-sm text-muted-foreground">
                    Then $99/month
                  </p>
                </div>

                <div className="space-y-3 pt-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>Daily curated deals posted to your groups</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>Complete tracking and analytics dashboard</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>WhatsApp group setup guidance</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>Automated payment processing</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>Priority customer support</span>
                  </div>
                </div>

                <Button size="lg" className="w-full text-lg py-6" asChild>
                  <a href="/auth">
                    Start Your Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </a>
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  No credit card required • Full access
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-5xl font-bold">
              Ready to Monetize Your Community?
            </h2>
            <p className="text-xl text-muted-foreground">
              Join organizations already earning passive income through Relay Station
            </p>
            <Button size="lg" className="text-lg px-8 py-6 h-auto" asChild>
              <a href="/auth">
                Get Started Free for 3 Months
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
