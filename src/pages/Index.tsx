import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, TestTube } from "lucide-react";
import { trackClick } from "@/utils/clickTracking";

const Index = () => {
  // Test Amazon URL with tracking code joshrelay-20
  const testUrl = "https://www.amazon.com/dp/B0D54JZTHY?ie=UTF8&ascsubtag=ece153f2c15f11f0b1d116eaf46a85e10INT&m=ATVPDKIKX0DER&psc=1&linkCode=ll1&tag=joshrelay-20&linkId=d16cf26f35763756f216ffae44618c7f&language=en_US&ref_=as_li_ss_tl";

  const handleTestClick = async () => {
    await trackClick({
      dealId: "test-deal-b0d54jzthy",
      targetUrl: testUrl,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">
              Welcome to Relay Station
            </h1>
            <p className="text-xl text-muted-foreground">
              Your affiliate deal tracking and management platform
            </p>
          </div>

          <Card className="border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-center gap-2 mb-2">
                <TestTube className="h-6 w-6 text-primary" />
                <CardTitle>Test Tracking Link</CardTitle>
              </div>
              <CardDescription>
                Click below to test the affiliate link tracking system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-mono break-all text-muted-foreground">
                    Tag: joshrelay-20
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Product: B0D54JZTHY
                  </p>
                </div>
                
                <Button 
                  size="lg" 
                  className="w-full"
                  asChild
                >
                  <a
                    href={testUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    onClick={handleTestClick}
                  >
                    Test Amazon Link
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>

                <p className="text-xs text-muted-foreground">
                  This will track the click in your analytics and open Amazon
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">View Deals</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/deals">Browse All Deals</a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/projects">Manage Projects</a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Generator</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/social-links-generator">Generate Content</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
