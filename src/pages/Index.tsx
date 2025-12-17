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
        <div className="container relative mx-auto px-4 py-12 sm:py-16 md:py-24 lg:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-4 sm:space-y-6 md:space-y-8">
            <Badge className="text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2" variant="secondary">
              🎉 Free for Your First 3 Months
            </Badge>
            <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Every Purchase Your Community Makes{" "}
              <span className="text-primary">Could Be Earning You Money</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
              We share the deals. You share with your WhatsApp groups. 
              Everyone earns from every purchase. Zero upfront cost.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 justify-center items-center pt-2 sm:pt-4">
              <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 py-4 sm:px-8 sm:py-6 h-auto" asChild>
                <a href="/auth">Start Free Trial</a>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg px-6 py-4 sm:px-8 sm:py-6 h-auto" asChild>
                <a href="#how-it-works">See How It Works</a>
              </Button>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Then $99/month after trial • We only earn when you earn
            </p>
          </div>
        </div>
      </section>

      {/* Target Audiences */}
      <section className="py-10 sm:py-14 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
              Perfect For Communities That Care
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
              Trusted by organizations looking to support their mission through ethical affiliate income
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto">
            <Card className="text-center border-2 hover:border-primary/50 transition-all">
              <CardHeader className="p-4 sm:p-6">
                <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                  <Church className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
                <CardTitle className="text-lg sm:text-xl md:text-2xl">Religious Organizations</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <p className="text-sm sm:text-base text-muted-foreground">
                  Fund your mission while serving your congregation with valuable deals
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 hover:border-primary/50 transition-all">
              <CardHeader className="p-4 sm:p-6">
                <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                  <School className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
                <CardTitle className="text-lg sm:text-xl md:text-2xl">Schools & PTAs</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <p className="text-sm sm:text-base text-muted-foreground">
                  Generate funds for programs without traditional fundraising
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 hover:border-primary/50 transition-all sm:col-span-2 md:col-span-1">
              <CardHeader className="p-4 sm:p-6">
                <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
                <CardTitle className="text-lg sm:text-xl md:text-2xl">Influencers</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <p className="text-sm sm:text-base text-muted-foreground">
                  Monetize your community with curated deals they'll love
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-10 sm:py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
              Simple. Automated. Profitable.
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
              Three steps to passive income for your community
            </p>
          </div>
          <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
            <div className="flex gap-4 sm:gap-6 items-start">
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-lg sm:text-xl font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2">Create Your WhatsApp Groups</h3>
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
                  Set up WhatsApp groups for your community members. We provide the setup guide and best practices.
                </p>
              </div>
            </div>

            <div className="flex gap-4 sm:gap-6 items-start">
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-lg sm:text-xl font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2">We Post Curated Deals Daily</h3>
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
                  Our team finds the best deals on Amazon and posts them directly to your groups. No work required from you.
                </p>
              </div>
            </div>

            <div className="flex gap-4 sm:gap-6 items-start">
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-lg sm:text-xl font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2">Earn From Every Purchase</h3>
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
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
